import { Project, DuplicateMatch } from '../types/project.js';
import { GeoSpatialService } from './geoSpatial.service.js';

export class NlpSimilarityService {
  private static stopWords = new Set([
    'and', 'or', 'the', 'a', 'an', 'in', 'at', 'of', 'for', 'to', 'from', 'with', 'by',
    'on', 'under', 'scheme', 'mplad', 'mplads'
  ]);

  public static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\bgram\b/g, 'village')
      .replace(/\bpanchayat\b/g, 'village')
      .replace(/\bbhavan\b/g, 'hall')
      .replace(/\bkendra\b/g, 'hall')
      .replace(/\bcenter\b/g, 'centre')
      .replace(/\bmultipurpose\b/g, '')
      .replace(/\bcultural\b/g, '')
      .replace(/\bloni\b/g, '')
      .replace(/\bblock\b/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static tokenize(text: string): string[] {
    const normalized = this.normalizeText(text);
    return normalized
      .split(/\s+/)
      .filter(token => token.length >= 2 && !this.stopWords.has(token));
  }

  private static getTermFrequencies(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
  }

  /**
   * Computes Hybrid Cosine & Token Jaccard Similarity between two texts
   */
  public static calculateCosineSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const tf1 = this.getTermFrequencies(tokens1);
    const tf2 = this.getTermFrequencies(tokens2);

    const allTerms = new Set([...tf1.keys(), ...tf2.keys()]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const term of allTerms) {
      const v1 = tf1.get(term) || 0;
      const v2 = tf2.get(term) || 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const cosine = (norm1 > 0 && norm2 > 0) ? dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2)) : 0;

    // Token Jaccard
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    let tokenInter = 0;
    for (const t of set1) {
      if (set2.has(t)) tokenInter++;
    }
    const tokenJaccard = (set1.size + set2.size - tokenInter > 0)
      ? tokenInter / (set1.size + set2.size - tokenInter)
      : 0;

    // Blended semantic similarity score (0 to 100%)
    const blended = (cosine * 0.60 + tokenJaccard * 0.40) * 100;
    return Math.min(100, Math.round(blended));
  }

  /**
   * Finds all duplicate or overlapping candidate projects across the dataset
   */
  public static findDuplicateMatches(
    project: Project,
    allProjects: Project[],
    similarityThreshold = 65,
    distanceThresholdKm = 10.0
  ): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];

    for (const other of allProjects) {
      if (other.project_id === project.project_id) continue;

      const distance = GeoSpatialService.calculateHaversineDistance(
        project.latitude,
        project.longitude,
        other.latitude,
        other.longitude
      );

      const isSameType = project.work_type === other.work_type;
      const similarity = this.calculateCosineSimilarity(project.work_name, other.work_name);

      const reasons: string[] = [];

      if (similarity >= similarityThreshold && distance <= distanceThresholdKm) {
        let indicator: DuplicateMatch['risk_indicator'] = 'Potential Duplicate';
        reasons.push(`High semantic similarity (${similarity}%) in project description`);
        reasons.push(`Geographically proximate (${distance} km distance)`);

        if (isSameType) {
          reasons.push(`Identical work category: ${project.work_type}`);
        }
        if (project.district === other.district) {
          reasons.push(`Same administrative district: ${project.district}`);
        }

        matches.push({
          matched_project_id: other.project_id,
          matched_work_name: other.work_name,
          matched_district: other.district,
          matched_agency: other.implementing_agency,
          matched_sanctioned_amount: other.sanctioned_amount,
          semantic_similarity: similarity,
          distance_km: distance,
          risk_indicator: indicator,
          reasons
        });
      } else if (similarity >= 75 && distance <= 25.0) {
        matches.push({
          matched_project_id: other.project_id,
          matched_work_name: other.work_name,
          matched_district: other.district,
          matched_agency: other.implementing_agency,
          matched_sanctioned_amount: other.sanctioned_amount,
          semantic_similarity: similarity,
          distance_km: distance,
          risk_indicator: 'Overlapping Scope',
          reasons: [
            `Strong scope overlap (${similarity}% text similarity)`,
            `Located within ${distance} km in ${other.district}`
          ]
        });
      }
    }

    return matches.sort((a, b) => b.semantic_similarity - a.semantic_similarity);
  }
}
