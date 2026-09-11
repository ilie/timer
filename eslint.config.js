import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
    {
        ignores: ['dist', 'build'],
    },
    {
        files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
        extends: [...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    },
    {
        files: ['public/service-worker.js'],
        extends: [...tseslint.configs.recommended],
    },
);
