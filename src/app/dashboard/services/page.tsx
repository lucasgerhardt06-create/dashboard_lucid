import { AnalyticsPage } from "@/components/dashboard/analytics-page";
import type { SearchProps } from "@/components/dashboard/story";
export const dynamic="force-dynamic";
export const revalidate=0;
export default function Page(props:SearchProps){return <AnalyticsPage page="services" {...props}/>;}
