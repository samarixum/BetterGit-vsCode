import * as vscode from 'vscode';
import * as cp from 'node:child_process';
import { outputChannel } from './extension.ts';

export class BetterGitContentProvider implements vscode.TextDocumentContentProvider {

    constructor(private extensionPath: string, private workspaceRoot: string | undefined) {}

    provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
        return new Promise(resolve => {
            // Authority is the SHA (or HEAD)
            const sha = uri.authority;

            if (sha === 'EMPTY') {
                resolve("");
                return;
            }

            // Path is the relative path (remove leading slash)
            const relPath = uri.path.substring(1);

            if (!this.workspaceRoot) {
                resolve("");
                return;
            }

            // Parse query for repo path
            let repoPath = this.workspaceRoot;
            if (uri.query) {
                const match = uri.query.match(/repo=([^&]+)/);
                if (match) {
                    repoPath = decodeURIComponent(match[1]);
                }
            }

            const config = vscode.workspace.getConfiguration('bettergit');
            const exePath = config.get<string>('executablePath');

            if (!exePath) {
                resolve("Error: BetterGit executable path not configured.");
                return;
            }

            outputChannel.appendLine(`[INFO] Loading file content: ${relPath} from ${sha}`);
            cp.execFile(exePath, ['cat-file', sha, relPath], { cwd: repoPath, encoding: 'utf8' }, (err: cp.ExecFileException | null, stdout: string) => {
                if (err) {
                    outputChannel.appendLine(`[INFO] File not found in ${sha}: ${relPath} (new file)`);
                    resolve(""); // Return empty if error (e.g. new file)
                } else {
                    outputChannel.appendLine(`[INFO] File content loaded: ${relPath}`);
                    resolve(stdout);
                }
            });
        });
    }
}
