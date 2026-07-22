import { type Request, type Response } from "express";
import { query } from "../database";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";

export async function getWeightEntriesByUser(req: Request, res: Response) {
    try {
        const result = await query(GET_WEIGHT_ENTRIES_BY_USER_QUERY, [
            req.user!.userId,
        ]);
        return res.status(200).send(result.rows);
    } catch (err) {
        console.error(`Caught getWeightEntries db error: ${err}`);
    }
}

export async function createWeightEntry(req: Request, res: Response) {
    const userId = req.user!.userId;
    const weight = req.body.weight;

    if (!weight) {
        return res.status(400).send("Invalid weight value");
    }

    try {
        const result = await query(CREATE_WEIGHT_ENTRY_QUERY, [userId, weight]);

        return res.status(201).send(result.rows);
    } catch (err) {
        console.error(`Caught createWeightEntry db error: ${err}`);
        return res.status(500).send("Db error");
    }
}

export async function createNutritionFactsEntry(req: Request, res: Response) {
    // const userId = req.user!.userId;

    if (!req.file) return res.status(400).send("Missing image");

    let worker;
    try {
        const processedImageBuffer = await sharp(req.file.buffer)
            .resize({ width: 1200 }) // Upscale/Downscale to standard reading width
            .grayscale() // Drop color noise
            .normalize() // Distribute contrast
            .threshold(140) // Convert pixels into absolute black or absolute white
            .toBuffer(); // Pass output back to RAM as a clean stream

        worker = await createWorker("eng");
        await worker.setParameters({
            tessedit_pageseg_mode: "6" as PSM,
            tessedit_char_blacklist: "~\\[]©™",
        });

        const imgResult = await worker.recognize(processedImageBuffer);
        const rawText = imgResult.data.text;
        const lines = rawText.split("\n");

        console.log("READING:::");

        const dataTargets = [
            "servings per",
            "serving size",
            // "calories",
            "total fat",
            "saturated fat",
            "trans fat",
            "cholesterol",
            "sodium",
            "total carbohydrate",
            "dietary fiber",
            "total sugars",
            "added sugars",
            "protein",
            "calcium",
        ];

        const minTargetLength = Math.min(...dataTargets.map((t) => t.length)); // e.g., 6
        const maxTargetLength = Math.max(...dataTargets.map((t) => t.length)); // e.g., 18

        // return target that best matches input string
        function fuzzyMatchString(targets: string[], input: string) {
            const cleanInput = input.toLowerCase().trim();
            let overallBest = { target: null as string | null, score: 0 };

            if (!cleanInput) return { target: null, score: 0 };

            for (const target of targets) {
                const cleanTarget = target.toLowerCase().trim();

                let targetIdx = 0;
                let matches = 0;

                for (
                    let inputIdx = 0;
                    inputIdx < cleanInput.length;
                    inputIdx++
                ) {
                    if (cleanInput[inputIdx] === cleanTarget[targetIdx]) {
                        matches++;
                        targetIdx++;
                    } else if (
                        (cleanInput[inputIdx] === "0" &&
                            cleanTarget[targetIdx] === "o") ||
                        (["1", "l", "|"].includes(cleanInput[inputIdx]) &&
                            cleanTarget[targetIdx] === "i")
                    ) {
                        matches += 0.9; // slightly less weight for ocr guess match
                        targetIdx++;
                    }

                    if (targetIdx >= cleanTarget.length) break;
                }
                const maxLength = Math.max(
                    cleanTarget.length,
                    cleanInput.length,
                );

                const score = matches / maxLength;

                if (score > overallBest.score) {
                    overallBest = { target, score };
                }
            }

            return overallBest;
        }

        function parseNutritionLine(targets: string[], text: string) {
            const cleanText = text.toLowerCase();
            let bestMatch: any = {
                target: null,
                score: 0,
                startIndex: 0,
                endIndex: 0,
            };

            for (let start = 0; start < text.length; start++) {
                const maxEnd = Math.min(
                    cleanText.length,
                    start + maxTargetLength + 3,
                ); // extra padding for ocr typos

                for (
                    let end = start + minTargetLength - 2;
                    end <= maxEnd;
                    end++
                ) {
                    const testPhrase = cleanText.slice(start, end);

                    const matchResult = fuzzyMatchString(targets, testPhrase);

                    if (matchResult && matchResult.score > bestMatch.score) {
                        bestMatch = {
                            target: matchResult.target,
                            score: matchResult.score,
                            startIndex: start, // beginning of matched word
                            endIndex: end, // end of matched word
                        };
                    }
                }
            }
            if (bestMatch.score > 0.65) {
                const valueZone = cleanText.slice(bestMatch.endIndex);
                bestMatch.valueContext = valueZone;
                return bestMatch;
            }

            return null;
        }

        // for each ocr text line
        for (const line of lines) {
            const result = parseNutritionLine(dataTargets, line);
            console.log("result:", result);
        }

        return res.status(201).send(rawText);
    } catch (err) {
        console.error("Tesseract error:", err);
        return res.status(500).send("Error scanning image");
    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
}

const GET_WEIGHT_ENTRIES_BY_USER_QUERY =
    "SELECT * FROM weight_entries WHERE user_id = $1 ORDER BY created_at DESC";
const CREATE_WEIGHT_ENTRY_QUERY =
    "INSERT INTO weight_entries (user_id, weight) VALUES ($1, $2) RETURNING *";
