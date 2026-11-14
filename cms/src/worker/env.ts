export interface Env {
  ASSETS: Fetcher;
  MEDIA: R2Bucket;
  DRAFT: DurableObjectNamespace;
  AUTH_MODE: "password" | "access";
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  GITHUB_REPO: string;
  PUBLISH_BRANCH: string;
  EDITOR_PASSWORD?: string;
  GITHUB_TOKEN?: string;
}
