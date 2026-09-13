import { checkbox, select } from '@inquirer/prompts';
import { configSchema, type ProjectConfig } from './model.js';
import type { InitOptions } from './install.js';

export const commaList = (value: string): string[] => value.split(',').map(s => s.trim()).filter(Boolean);
export function parseTools(value: string) {
  if (value === 'none') return [];
  const values = commaList(value);
  if (!values.length) throw new Error('Choose codex, claude, cursor, or none.');
  return configSchema.shape.tools.parse(values);
}

type Theme = ProjectConfig['visuals']['themes'];

export function selectAgentTools(context?: Parameters<typeof checkbox>[1], selected: ProjectConfig['tools'] = []) {
  (context?.output ?? process.stdout).write('Choose at least one coding agent to receive ReleaseKit skills.\nUse Space to select or clear tools, then Enter to continue.\n\n');
  return checkbox<ProjectConfig['tools'][number]>({
    message: 'Which agent tools do you use?',
    choices: [
      { name: 'Codex', value: 'codex', checked: selected.includes('codex') },
      { name: 'Claude Code', value: 'claude', checked: selected.includes('claude') },
      { name: 'Cursor', value: 'cursor', checked: selected.includes('cursor') },
    ],
    required: true,
    loop: false,
    shortcuts: { all: 'a', invert: 'i' },
  }, context);
}

interface SetupPrompts {
  tools?: (selected: ProjectConfig['tools']) => Promise<ProjectConfig['tools']>;
  theme?: () => Promise<Theme>;
}

export function selectImageThemes(context?: Parameters<typeof select>[1]) {
  (context?.output ?? process.stdout).write('Choose the theme variants for generated release-note illustrations.\nThis default applies to new drafts and can be changed later.\n\n');
  return select<Theme>({
    message: 'Which image themes should new drafts use?',
    choices: [
      { name: 'Both dark and light (recommended)', value: 'both',
        description: 'Two matching versions of each illustration, one for dark backgrounds and one for light. Choose this when your product supports both themes.' },
      { name: 'Dark only', value: 'dark',
        description: 'One version of each illustration for dark backgrounds. Choose this when your release notes are always shown in a dark theme.' },
      { name: 'Light only', value: 'light',
        description: 'One version of each illustration for light backgrounds. Choose this when your release notes are always shown in a light theme.' },
    ],
    default: 'both',
    loop: false,
  }, context);
}

// All other settings retain their explicit values or initProject defaults.
export async function interactiveSetup(options: InitOptions, prompts: SetupPrompts = {}, existingTools?: ProjectConfig['tools']): Promise<InitOptions> {
  try {
    const tools = options.tools ?? await (prompts.tools ?? (selected => selectAgentTools(undefined, selected)))(existingTools ?? []);
    if (existingTools !== undefined) return { ...options, tools };
    const themes = options.themes ?? await (prompts.theme ?? selectImageThemes)();
    return { ...options, tools, themes };
  } catch (error) {
    if (error instanceof Error && ['ExitPromptError', 'AbortPromptError'].includes(error.name)) {
      throw new Error('Setup cancelled. No configuration was written.');
    }
    throw error;
  }
}
