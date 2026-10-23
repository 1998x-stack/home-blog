import { issueCsrf } from "@/lib/csrf";
export const dynamic="force-dynamic";
export function GET(){return issueCsrf();}
