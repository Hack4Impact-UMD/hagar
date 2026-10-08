# Hagar

This repository contains the source code for Hagar's Analytics Management Platform, a full-stack TypeScript web application built with React and Vite, with a tRPC backend on Firebase.

## 📚 Table of contents

- [👥 Meet the team](#-meet-the-team)
- [🛠️ Setting up the project](#️-setting-up-the-project)
- [📝 Making a pull request](#-making-a-pull-request)

## 👥 Meet the team

Meet our wonderful team of Product Managers, Tech Leads, Designers, Engineers, and Mentors!

<table align="center">
  <tr>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/👩‍💼_product_manager-007ACC?style=flat-square" alt="Product Manager"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/👩‍💼_product_manager-007ACC?style=flat-square" alt="Product Manager"/>
      </a>
    </td>
  </tr>
</table>

<table align="center">
  <tr>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/joelchem/">
        <img src="docs/team-photos/joel_chemmanur.jpeg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Joel Chemmanur"/><br/>
        <b>Joel Chemmanur</b><br/><br/>
        <img src="https://img.shields.io/badge/🛠️_technical_lead-FF5733?style=flat-square" alt="Technical Lead"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/aarav-verma">
        <img src="docs/team-photos/aarav_verma.jpeg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Aarav Verma"/><br/>
        <b>Aarav Verma</b><br/><br/>
        <img src="https://img.shields.io/badge/🛠️_technical_lead-FF5733?style=flat-square" alt="Technical Lead"/>
      </a>
    </td>
  </tr>
</table>

<table align="center">
  <tr>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/🎨_designer-9B59B6?style=flat-square" alt="Designer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/🎨_designer-9B59B6?style=flat-square" alt="Designer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/🎨_designer-9B59B6?style=flat-square" alt="Designer"/>
      </a>
    </td>
  </tr>
</table>

<table align="center">
  <tr>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/achyut-anoop/">
        <img src="docs/team-photos/achyut_anoop.JPG" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Achyut Anoop"/><br/>
        <b>Achyut Anoop</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/alisha-wu/">
        <img src="docs/team-photos/alisha_wu.PNG" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Alisha Wu"/><br/>
        <b>Alisha Wu</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Indira</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/syednahm">
        <img src="docs/team-photos/nazeer_ahmed.jpeg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Nazeer Ahmed"/><br/>
        <b>Nazeer Ahmed</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/-saanvikataria">
        <img src="docs/team-photos/saanvi_kataria.jpg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Saanvi Kataria"/><br/>
        <b>Saanvi Kataria</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/srihas-inaganti/">
        <img src="docs/team-photos/srihas_inaganti.jpg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Srihas Inaganti"/><br/>
        <b>Srihas Inaganti</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://www.linkedin.com/in/xustanley">
        <img src="docs/team-photos/stanley_xu.jpeg" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Stanley Xu"/><br/>
        <b>Stanley Xu</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Yuvan</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
  </tr>
</table>

## 🛠️ Setting up the project

The instructions here are important to follow, messing up here will lead to issues later on. If you have any questions, reach out to the Tech Leads.

1. **Install the following tools.**

   | Tool    | Version                                                |
   | ------- | ------------------------------------------------------ |
   | Git     | Any recent version                                     |
   | Node.js | 22 or later                                            |
   | pnpm    | 11 or later (you can install with `npx get-pnpm`)      |
   | Java    | 21 or later (the Auth and Firestore emulators need it) |

   We recommend VS Code with these extensions:
   - [oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode), which shows lint errors and formats your code with our config
   - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss), which autocompletes Tailwind classes

2. **Clone and install.**

   ```sh
   git clone https://github.com/Hack4Impact-UMD/hagar.git
   cd hagar
   pnpm install
   ```

3. **Install the Firebase CLI and log in.**

   ```sh
   npm install -g firebase-tools
   firebase login
   ```

   Log in with the Google account you gave the Tech Leads. They will add you to the Hagar Firebase project. The repo is already linked to it. Run `firebase use` to check, it should print `hagar-intl`.

4. **Set up your `.env`.** The Tech Leads will send you a `.env` file. Put it in the root of the project, next to `.env.example`. If you haven't been sent one, copy the example and ask the Tech Leads for the values:

   ```sh
   cp .env.example .env
   ```

   You don't need a `.env` to run the app locally, the emulators accept any values. You do need it to connect to the real Firebase project. Never commit your `.env`, it's already in `.gitignore`.

5. **Install the Playwright browser.**

   ```
   pnpm exec playwright install chromium
   ```

6. **Start the app.**

   ```
   pnpm dev
   ```

   This opens the app at http://127.0.0.1:5173 and the Emulator UI at http://127.0.0.1:4000. To start just the emulators, use `pnpm emulators`

7. **Make sure you pass the tests.**

   ```
   pnpm checks
   pnpm test:e2e
   ```

   If formatting fails, run `pnpm format`. To run one particular test, use `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`.

## 📝 Making a pull request

1. **Pick up an issue.** Issues will be assigned by Tech Leads. Every PR should map to a GitHub issue.

2. **Branch off `main`.**

   ```sh
   git checkout main && git pull
   git checkout -b <your-name>/<short-description>
   ```

3. **Commit and push your work.** Have small, focused commits instead of giant ones. Your commit message should say what the commit does, so someone reading `git log` can understand it without opening the diff.

   | Good                             | Bad        |
   | -------------------------------- | ---------- |
   | `Add team photo for Aarav`       | `fix`      |
   | `Validate email on signup form`  | `stuff`    |
   | `Fix redirect loop after logout` | `aaravsux` |

   The first time you push your branch, set its upstream:

   ```sh
   git push -u origin <your-name>/<short-description>
   ```

   After that, `git push` is enough.

4. **Run the checks and E2E tests.** Both must pass before you open the PR:

   ```sh
   pnpm checks
   pnpm test:e2e
   ```

   If the format check fails, run `pnpm format` to fix it. If an E2E test fails, `pnpm test:e2e:ui` opens Playwright's UI so you can step through it.

5. **Open the PR into `main`.** There exists a template to follow, make sure you follow it exactly so that we can map a PR to a Github Issue.

6. **Address every CodeRabbit comment.** Fix the ones that are right. If you
   think a comment is wrong, reply to it and explain why. Don't leave any
   comment without a fix or a reply.

7. **Request review.** Once CI is green (which is when all the GitHub checks have a green checkmark) and CodeRabbit's comments are handled,
   add **Joel** (@joelchem) and **Aarav** (@constrictingsnake) as reviewers, and ping the tech leads in the private leadership chat.

8. **Respond to feedback.** Push fixes, re-request review, ping in leadership slack again, and merge once
   the PR is approved.
