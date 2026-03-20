import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { getDashboardRoute } from "@/lib/role-routes";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifyAuthToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  redirect(getDashboardRoute(session.role));
}
