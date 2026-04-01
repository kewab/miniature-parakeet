/**
 * Learn from human edits by analyzing diffs between draft and final.
 *
 * Usage:
 *   npx tsx src/learn-edits.ts --client demo --draft draft.md --final final.md
 *   npx tsx src/learn-edits.ts --client demo --summarize
 */
interface DiffAnalysis {
    total_additions: number;
    total_deletions: number;
    categories: {
        word_replacements: unknown[];
        paragraph_deletions: unknown[];
        paragraph_additions: unknown[];
        structure_changes: unknown[];
        title_changes: {
            from: string;
            to: string;
        }[];
        tone_adjustments: unknown[];
    };
    raw_additions: string[];
    raw_deletions: string[];
}
declare function analyzeDiff(draftText: string, finalText: string): DiffAnalysis;
export { analyzeDiff, type DiffAnalysis };
