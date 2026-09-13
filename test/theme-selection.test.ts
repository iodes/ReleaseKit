import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { interactiveSetup, selectImageThemes, selectAgentTools } from '../src/setup.js';

async function picker() {
  const input = new PassThrough();
  const output = new PassThrough();
  let screen = '';
  output.on('data', chunk => { screen += chunk.toString(); });
  const answer = interactiveSetup({ tools: [] }, { theme: () => selectImageThemes({ input, output }) });
  await vi.waitFor(() => expect(screen).toContain('Light only'));
  return { input, output, answer };
}

describe('tools then theme setup', () => {
  it.each([false, true])('preselects saved tools on re-init and skips theme selection (add tool: %j)', async addTool => {
    const input = new PassThrough();
    const output = new PassThrough();
    let screen = '';
    output.on('data', chunk => { screen += chunk.toString(); });
    const theme = vi.fn(async () => 'both' as const);
    const answer = interactiveSetup({}, {
      tools: selected => selectAgentTools({ input, output }, selected), theme,
    }, ['codex']);
    await vi.waitFor(() => expect(screen).toContain('Cursor'));
    if (addTool) {
      input.write('\u001b[B');
      input.write(' ');
    }
    input.write('\r');
    expect(await answer).toEqual({ tools: addTool ? ['codex', 'claude'] : ['codex'] });
    expect(theme).not.toHaveBeenCalled();
    input.destroy(); output.destroy();
  });

  it('cancels reconfiguration without returning a replacement selection', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let screen = '';
    output.on('data', chunk => { screen += chunk.toString(); });
    const answer = interactiveSetup({}, { tools: selected => selectAgentTools({ input, output }, selected) }, ['codex']);
    const cancelled = expect(answer).rejects.toThrow('Setup cancelled');
    await vi.waitFor(() => expect(screen).toContain('Cursor'));
    input.write('\u0003');
    await cancelled;
    input.destroy(); output.destroy();
  });

  it('skips all prompts when reconfiguring with explicit tools', async () => {
    const tools = vi.fn(async () => ['cursor'] as ['cursor']);
    const theme = vi.fn(async () => 'both' as const);
    expect(await interactiveSetup({ tools: [] }, { tools, theme }, ['codex'])).toEqual({ tools: [] });
    expect(tools).not.toHaveBeenCalled();
    expect(theme).not.toHaveBeenCalled();
  });

  it('starts empty and blocks submission until a tool is selected', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let screen = '';
    output.on('data', chunk => { screen += chunk.toString(); });
    const themeOutput = new PassThrough();
    themeOutput.on('data', chunk => { screen += chunk.toString(); });
    const answer = interactiveSetup({}, {
      tools: () => selectAgentTools({ input, output }),
      theme: () => selectImageThemes({ input, output: themeOutput }),
    });
    await vi.waitFor(() => expect(screen).toContain('Cursor'));
    expect(screen).not.toContain('Which image themes');
    input.write('\r'); // All tools start unselected.
    await vi.waitFor(() => expect(screen).toContain('At least one choice must be selected'));
    expect(screen).not.toContain('Which image themes');
    input.write('\u001b[B');
    input.write(' '); // Select Claude Code.
    input.write('\r');
    await vi.waitFor(() => expect(screen).toContain('Light only'));
    input.write('\u001b[B');
    input.write('\r');
    expect(await answer).toEqual({ tools: ['claude'], themes: 'dark' });
    input.destroy(); output.destroy(); themeOutput.destroy();
  });

  it('asks for tools when only the theme is supplied', async () => {
    const tools = vi.fn(async () => ['codex'] as ['codex']);
    const theme = vi.fn(async () => 'light' as const);
    expect(await interactiveSetup({ themes: 'both' }, { tools, theme })).toEqual({ tools: ['codex'], themes: 'both' });
    expect(tools).toHaveBeenCalledTimes(1);
    expect(theme).not.toHaveBeenCalled();
  });

  it('cancels at tool selection before asking about themes', async () => {
    const theme = vi.fn(async () => 'light' as const);
    const tools = async (): Promise<never> => { const error = new Error('cancelled'); error.name = 'ExitPromptError'; throw error; };
    await expect(interactiveSetup({}, { tools, theme })).rejects.toThrow('Setup cancelled. No configuration was written.');
    expect(theme).not.toHaveBeenCalled();
  });

  it('selects a single theme with arrow keys and Enter', async () => {
    const { input, output, answer } = await picker();
    input.write('\u001b[B');
    input.write('\u001b[B');
    input.write('\u001b[A');
    input.write('\r');
    expect(await answer).toEqual({ tools: [], themes: 'dark' });
    input.destroy(); output.destroy();
  });

  it('defaults to both themes with Enter', async () => {
    const { input, output, answer } = await picker();
    input.write('\r');
    expect(await answer).toEqual({ tools: [], themes: 'both' });
    input.destroy(); output.destroy();
  });

  it('cancels instead of accepting a partial setup', async () => {
    const { input, output, answer } = await picker();
    const cancelled = expect(answer).rejects.toThrow('Setup cancelled. No configuration was written.');
    input.write('\u0003');
    await cancelled;
    input.destroy(); output.destroy();
  });

  it('skips explicitly supplied tools and themes', async () => {
    const chooseTheme = vi.fn(async () => 'light' as const);
    expect(await interactiveSetup({ tools: ['codex'], product: 'Example' }, { theme: chooseTheme }))
      .toEqual({ tools: ['codex'], product: 'Example', themes: 'light' });
    expect(chooseTheme).toHaveBeenCalledTimes(1);
    chooseTheme.mockClear();
    expect(await interactiveSetup({ tools: [], themes: 'both' }, { theme: chooseTheme })).toEqual({ tools: [], themes: 'both' });
    expect(chooseTheme).not.toHaveBeenCalled();
  });
});
