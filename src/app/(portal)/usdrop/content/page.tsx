import { supabaseUsdrop } from "@/lib/supabase"
import { PageHeader } from "@/components/shared/page-header"
import { ContentTabs } from "./ContentTabs"

export const dynamic = "force-dynamic"
export const metadata = { title: "Content — USDrop | Suprans" }

async function fetchContent() {
  const [articles, links, adVideos, roadmapTasks, croItems, onboardingVideos] = await Promise.all([
    supabaseUsdrop
      .from("intelligence_articles")
      .select(
        "id, slug, title, category, featured, featured_image, read_time, views, likes, published_date, created_at",
      )
      .order("created_at", { ascending: false }),
    supabaseUsdrop
      .from("important_links")
      .select("id, title, url, description, category, is_published, order_index, created_at")
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("ad_videos")
      .select(
        "id, title, video_url, thumbnail_url, category, views, likes, is_published, order_index, date_added, created_at",
      )
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("roadmap_tasks")
      .select("id, stage_id, task_no, title, link, order_index, is_published, created_at")
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("cro_items")
      .select(
        "id, category_id, label, description, priority, order_index, is_published, created_at",
      )
      .order("order_index", { ascending: true }),
    supabaseUsdrop
      .from("onboarding_videos")
      .select(
        "id, module_id, title, description, video_url, video_duration, order_index, created_at",
      )
      .order("order_index", { ascending: true }),
  ])

  return {
    articles: articles.data ?? [],
    links: links.data ?? [],
    adVideos: adVideos.data ?? [],
    roadmapTasks: roadmapTasks.data ?? [],
    croItems: croItems.data ?? [],
    onboardingVideos: onboardingVideos.data ?? [],
  }
}

export default async function ContentPage() {
  const data = await fetchContent()
  return (
    <div className="space-y-5">
      <PageHeader
        title="Content"
        subtitle="Articles, links, videos, roadmap tasks, and the CRO checklist the client app renders."
      />
      <ContentTabs {...data} />
    </div>
  )
}
