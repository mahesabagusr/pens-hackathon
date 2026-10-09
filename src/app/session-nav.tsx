import { Suspense } from "react";
import { currentUser } from "~/server/auth";
import { Nav } from "./motion-ui";

async function Session() {
  // A down database should not take the whole site with it: show the guest navbar.
  const user = await currentUser().catch(() => null);
  return <Nav user={user && { name: user.name, email: user.email }} />;
}

export function SessionNav() {
  return (
    <Suspense fallback={<Nav />}>
      <Session />
    </Suspense>
  );
}
