export const reduceTokensFromHtml = (html: string) => {
  return html.replace(/\s{2,}/g, ' ').replace(/<!--[\s\S]*?-->/g, '');
};

export const formatAnnouncementTitle = (title: string) => {
  return title.replaceAll('<br>', '\n');
};

export const formatAnnouncementCreatedAt = (createdAt: string) => {
  return createdAt.replaceAll('<br>', '\n');
};
