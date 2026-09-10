import { networkInsights } from "@/lib/insights/pages";
import {PageHeader} from "@/components/dashboard/analytics-ui";
import {ChartPanel,Findings,PreviewBanner,type SearchProps} from "@/components/dashboard/story";
import {FriendsGraph} from "@/components/dashboard/friends-graph";
import {Bars} from "@/components/dashboard/charts";
import {readView} from "@/lib/views";
import {anonymizeNetwork,networkStats} from "@/lib/insights/network";
import {group} from "@/lib/insights";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function Page({searchParams}:SearchProps){const preview=(await searchParams).apercu==="1";const [profiles,names,friends,social]=await Promise.all([readView("profiles",{preview}),readView("profiles_public",{preview}),readView("friendships",{preview}),readView("v_social",{preview})]);const error=profiles.error||names.error||friends.error;const data=anonymizeNetwork(profiles.data,names.data,friends.data),stats=networkStats(data);return <><PreviewBanner preview={preview}/><PageHeader title="Amis" description="Les liens qui donnent envie de revenir. Seules les amitiés acceptées sont représentées."/><Findings items={networkInsights(error,stats,data)}/><ChartPanel title="La constellation des amitiés" source="friendships / profiles / profiles_public" window="État actuel" caveat="Noms affichés anonymisés. Par défaut : le plus grand groupe. Les doublons réciproques et les liens vers des profils absents sont écartés." error={error}><FriendsGraph data={data}/></ChartPanel><div className="mt-5"><ChartPanel title="Les gestes sociaux" source="v_social" window="30 jours" caveat="Démo et dev inclus" error={social.error}><Bars title="Événements sociaux" rows={group(social.data,"event_name","n")}/></ChartPanel></div></>;}
