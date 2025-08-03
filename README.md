# Resume

## Quick Start

```bash
nvm use
pnpm install
pre-commit install
pnpm run server
pnpm run ci
```

## Testing

Test Locally

```sh
# start the dev server
npx next dev -p 4001
pnpm run test -- --spec test/specs/svg.e2e.ts
```

Deploy to Vercel without having to commit or push (the randomized URL for viewing build will be in the output of this command). Note: this will create the directory `.vercel` at the root of the project, which is in .gitignore.  So, if this is a clean clone, this will prompt for a setup.  Following the setup prompts configure the local repo.

```sh
# preview deployment
npx vercel
npx vercel --prod
```

Spell check against a [aspell definition in dotfiles](https://github.com/a2f0/dotfiles/blob/main/files/aspell.en.pws)

```sh
aspell --master=en_US --lang=en_US -c resume.json
```
