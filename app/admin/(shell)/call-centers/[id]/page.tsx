import { CallCenterDetail } from "./detail";

export default async function CallCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CallCenterDetail id={Number(id)} />;
}
