export type KnowledgeArticle = {
  title: string;
  category: 'onboarding' | 'operations' | 'security';
  views: number | null;
  helpfulScore: number | null;
};

export type KnowledgeBaseSummary = {
  service: string;
  status: 'not_configured';
  metrics: {
    articleCoverage: number | null;
    activeAuthors: number | null;
    publishedArticles: number | null;
  };
  articles: KnowledgeArticle[];
};

export function getKnowledgeBaseSummary(): KnowledgeBaseSummary {
  return {
  "service": "erp-api",
  "status": "not_configured",
  "metrics": {
    "articleCoverage": null,
    "activeAuthors": null,
    "publishedArticles": null
  },
  "articles": []
};
}
