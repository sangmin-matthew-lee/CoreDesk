import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function ServiceCallsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(false);
  if (!user) {
    redirect("/login");
  }

  // Only Management and Super Admin accounts can access the Service Calls module
  if (user.dept !== "Management" && user.dept !== "Super Admin") {
    redirect("/sales");
  }

  return <>{children}</>;
}
