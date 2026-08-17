/** Форма `data` для одной ссылки — docs/api/types.ts (`Link`). */
export interface LinkResponseDto {
  id: number;
  code: string;
  shortUrl: string;
  originalUrl: string;
  title: string | null;
  clicksCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface DeleteResultDto {
  deleted: true;
}
