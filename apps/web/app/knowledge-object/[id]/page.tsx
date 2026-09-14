import InvestigationClient from "../../investigation/[id]/investigation-client";
export default async function KnowledgeObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvestigationClient investigationId={decodeURIComponent(id)} />;
}
