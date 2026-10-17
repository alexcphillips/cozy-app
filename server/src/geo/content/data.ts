import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { z } from "zod";
import { CONFIG_FILES, DATA_FOLDERS, type ConfigFile, type DataFolder, type GameData } from "./data.schema";

/**
 * Loads `geo/data/`: every card, item, enemy and tuning number in the game,
 * one TypeScript file each, whose default export is the entry. See
 * `data/README.md` for the layout, and each folder's README.md for its
 * fields; the models they're written against are `content/models.ts`.
 *
 * Every file is checked against its folder's schema, and every problem is
 * reported at once with its file, so one start shows them all. Nothing here
 * knows about other files; `content/index.ts` then checks the references
 * (a recipe's items exist, and so on).
 */

export const DATA_DIR = fileURLToPath(new URL("../data/", import.meta.url));

export class GameDataError extends Error {
    readonly problems: string[];

    constructor(problems: string[]) {
        super(`geo-game data has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
        this.name = "GameDataError";
        this.problems = problems;
    }
}

/** offHand → off-hand: an armour slot as its folder name. */
const slotFolderName = (slot: string) => slot.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const isDataFile = (name: string) => name.endsWith(".ts") && !name.endsWith(".d.ts") && !name.endsWith(".test.ts");

function dataFilesIn(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) return dataFilesIn(path);
            return isDataFile(entry.name) ? [path] : [];
        });
}

/** `actions.0.amount: Invalid input` — where in the file, and what's wrong. */
function describeIssues(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const where = issue.path.length > 0 ? issue.path.join(".") : "(file)";
        return `${where}: ${issue.message}`;
    });
}

export async function loadGameData(dir: string = DATA_DIR): Promise<GameData> {
    const problems: string[] = [];
    const show = (path: string) => relative(dir, path);

    async function read<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S> | undefined> {
        let module: { default?: unknown };
        try {
            module = (await import(pathToFileURL(path).href)) as { default?: unknown };
        } catch (error) {
            problems.push(`${show(path)}: doesn't load (${(error as Error).message.split("\n")[0]})`);
            return undefined;
        }
        if (module.default === undefined) {
            problems.push(`${show(path)}: has no \`export default { … }\``);
            return undefined;
        }
        const parsed = schema.safeParse(module.default);
        if (!parsed.success) {
            for (const issue of describeIssues(parsed.error)) problems.push(`${show(path)}: ${issue}`);
            return undefined;
        }
        return parsed.data;
    }

    if (!existsSync(dir)) throw new GameDataError([`no data folder at ${dir}`]);
    for (const name of readdirSync(dir)) {
        if (name.startsWith(".") || name.endsWith(".md")) continue;
        if (name !== "config" && !(name in DATA_FOLDERS)) {
            const known = [...Object.keys(DATA_FOLDERS), "config"].join(", ");
            problems.push(`${name}: not a data folder (known: ${known})`);
        }
    }

    const folders = {} as Record<DataFolder, unknown[]>;
    for (const folder of Object.keys(DATA_FOLDERS) as DataFolder[]) {
        const path = join(dir, folder);
        folders[folder] = [];
        if (!existsSync(path)) continue;
        if (!statSync(path).isDirectory()) {
            problems.push(`${folder}: should be a folder`);
            continue;
        }
        const files = dataFilesIn(path);
        const entries = await Promise.all(files.map((file) => read(file, DATA_FOLDERS[folder])));
        entries.forEach((entry, index) => {
            const file = files[index] as string;
            if (!entry) return;
            const expected = `${entry.id}.ts`;
            if (basename(file) !== expected) {
                problems.push(`${show(file)}: id "${entry.id}" doesn't match the file name (rename it ${expected})`);
                return;
            }
            // Armour is sorted into a folder per slot: armour/head/, armour/off-hand/…
            if (folder === "armour" && "slot" in entry) {
                const slotFolder = slotFolderName(String(entry.slot));
                if (basename(dirname(file)) !== slotFolder) {
                    problems.push(`${show(file)}: a ${entry.slot} piece goes in armour/${slotFolder}/`);
                    return;
                }
            }
            folders[folder].push(entry);
        });
    }

    const config = {} as Record<ConfigFile, unknown>;
    const configDir = join(dir, "config");
    for (const name of Object.keys(CONFIG_FILES) as ConfigFile[]) {
        const path = join(configDir, `${name}.ts`);
        if (!existsSync(path)) {
            problems.push(`config/${name}.ts: missing`);
            continue;
        }
        config[name] = await read(path, CONFIG_FILES[name]);
    }
    if (existsSync(configDir)) {
        for (const file of readdirSync(configDir)) {
            if (isDataFile(file) && !(file.slice(0, -3) in CONFIG_FILES)) {
                problems.push(`config/${file}: not a config file (known: ${Object.keys(CONFIG_FILES).join(", ")})`);
            }
        }
    }

    if (problems.length > 0) throw new GameDataError(problems);
    return { ...folders, config } as GameData;
}
