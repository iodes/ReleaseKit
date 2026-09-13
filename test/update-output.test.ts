import { describe, expect, it } from 'vitest';
import { formatUpdate, formatUpdateFailure, type updateProject } from '../src/install.js';

const result: Awaited<ReturnType<typeof updateProject>> = {
  product: 'Example Workspace', tools: ['codex'], written: [], unchanged: [], conflicts: [],
  hints: { codex: 'Use $releasekit-draft.', claude: 'Use /releasekit-draft.', cursor: 'Use releasekit-draft.' },
};

describe('update result presentation', () => {
  it('distinguishes an applied update from already-current skills', () => {
    const updated = formatUpdate({ ...result, written: ['new.md'], unchanged: ['current.md', 'other.md'] });
    expect(updated).toContain('✓ Update complete');
    expect(updated).toMatch(/Updated:\s+1 file\n/);
    expect(updated).toMatch(/Already current:\s+2 files\n/);
    expect(updated).toContain('$releasekit-draft');
    expect(updated).not.toContain('\u001b[');
    const current = formatUpdate({ ...result, unchanged: ['current.md'] });
    expect(current).toContain('✓ Already up to date');
    expect(current).toMatch(/Updated:\s+0 files/);
  });

  it('reports partial progress and every preserved conflict without a success status', () => {
    const output = formatUpdate({ ...result, written: ['updated.md'], conflicts: ['custom.md', 'references/edited.md'] });
    expect(output).toContain('! Update needs attention');
    expect(output).toMatch(/Updated:\s+1 file\n/);
    expect(output).toMatch(/Preserved edits:\s+2 files/);
    expect(output).toContain('custom.md');
    expect(output).toContain('references/edited.md');
    expect(output).toContain('rerun releasekit update');
    expect(output).not.toContain('✓');
    expect(output).not.toContain('releasekit status');
  });

  it('gives configuration guidance when no tools are selected', () => {
    const output = formatUpdate({ ...result, tools: [] });
    expect(output).toContain('− Update skipped');
    expect(output).toContain('Tools: none');
    expect(output).toContain('releasekit/config.yaml');
    expect(output).not.toMatch(/✓|Updated:|Agent commands/);
  });

  it('retains multiline error details and project context without claiming rollback', () => {
    const output = formatUpdateFailure('Permission denied\r\n  skills/example.md', { projectRoot: 'C:/my-project' });
    expect(output).toContain('✕ Update failed');
    expect(output).toContain('C:/my-project');
    expect(output).toContain('Permission denied\n    skills/example.md');
    expect(output).toContain('releasekit update again');
    expect(output).not.toMatch(/✓|No files|rollback|\u001b\[/);
  });
});
