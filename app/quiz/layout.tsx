import type { ReactNode } from "react";
import { protectRoute } from "../../components/protected-route";
export default async function Layout({ children }: { children: ReactNode }) { await protectRoute(); return children; }
