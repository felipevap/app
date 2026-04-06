import { getSessionFromCookies } from "@/lib/session";
import HomeLanding from "@/components/home/HomeLanding";

export default async function Home() {
    const session = await getSessionFromCookies();
    return (
        <HomeLanding isLoggedIn={!!session} isSuperAdmin={session?.superAdmin ?? false} />
    );
}
