import { notFound } from "next/navigation";
import { PostView } from "@/app/page";
import { getMockPost } from "@/lib/mock-circles";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getMockPost(decodeURIComponent(id));
  if (!post) notFound();
  return <PostView post={post} />;
}
