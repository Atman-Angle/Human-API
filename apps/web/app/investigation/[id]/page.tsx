import InvestigationClient from "./investigation-client";

export default async function InvestigationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvestigationClient investigationId={decodeURIComponent(id)} />;
}
