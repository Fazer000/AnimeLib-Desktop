import axios from 'axios';
import { SHIKIMORI_API_URL, SHIKIMORI_TIMEOUT_MS } from '../../constants';
import type { ShikimoriFranchise } from '../utils/shikimoriFranchise';

const shikimoriClient = axios.create({
  baseURL: SHIKIMORI_API_URL,
  timeout: SHIKIMORI_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

export const shikimoriApi = {
  /**
   * Вся франшиза тайтла: тайтлы с датами и связи между ними
   */
  getFranchise: async (shikimoriId: number): Promise<ShikimoriFranchise> => {
    const response = await shikimoriClient.get(
      `/animes/${shikimoriId}/franchise`,
    );
    return response.data;
  },
};

export default shikimoriApi;
