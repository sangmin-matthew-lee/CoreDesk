terraform {
  required_version = ">= 1.0.0"
  backend "gcs" {} # Configured dynamically in CI/CD pipeline
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
  zone    = var.gcp_zone
}

variable "gcp_project" {
  type        = string
  description = "GCP Project ID"
}

variable "gcp_region" {
  type        = string
  default     = "us-central1"
  description = "GCP Region"
}

variable "gcp_zone" {
  type        = string
  default     = "us-central1-a"
  description = "GCP Zone"
}

variable "vm_name" {
  type        = string
  default     = "coredesk-vm"
  description = "Name of the VM Instance"
}

# Reserve a static external IP address
resource "google_compute_address" "static_ip" {
  name   = "${var.vm_name}-ip"
  region = var.gcp_region
}

# Allow HTTP and SSH traffic
resource "google_compute_firewall" "allow_http_ssh" {
  name    = "${var.vm_name}-firewall"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "80"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server", "ssh-server"]
}

# Compute Engine Instance (e2-micro)
resource "google_compute_instance" "vm_instance" {
  name         = var.vm_name
  machine_type = "e2-micro" # 1GB RAM, Free Tier eligible
  tags         = ["http-server", "ssh-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12" # Debian 12 (latest stable)
      size  = 30 # 30GB standard persistent disk is Free Tier eligible
      type  = "pd-standard"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  metadata = {
    # Install Docker and Docker Compose on startup
    startup-script = <<-EOT
      #!/bin/bash
      apt-get update
      apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
      
      # Add Docker's official GPG key
      mkdir -p /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      
      # Set up repository
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      
      systemctl enable docker
      systemctl start docker
    EOT
  }

  service_account {
    scopes = ["cloud-platform"]
  }
}

output "public_ip" {
  value       = google_compute_address.static_ip.address
  description = "The public static IP address of the CoreDesk instance"
}
