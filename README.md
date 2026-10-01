# Hagar

This repository contains the source code for Hagar's Analytics Management Platform, a full-stack TypeScript web application built with React and Vite, with a tRPC backend on Firebase.

## Table of contents

- [Setting up the project](#setting-up-the-project)
- [Making a pull request](#making-a-pull-request)
- [Meet the team](#meet-the-team)

## Setting up the project

The instructions here are important to follow, messing up here will lead to issues later on. If you have any questions, reach out to the Tech Leads.

1. Install the following tools:

   | Tool    | Version                                                |
   | ------- | ------------------------------------------------------ |
   | Node.js | 22 or later                                            |
   | pnpm    | 11 or later                                            |
   | Java    | 21 or later (the Auth and Firestore emulators need it) |

2. Clone and install:

   ```sh
   git clone https://github.com/Hack4Impact-UMD/hagar.git
   cd hagar
   pnpm install
   ```

3. Install the Playwright browser:

   ```
   pnpm exec playwright install chromium
   ```

4. Start the app:

   ```
   pnpm dev
   ```

   This opens the app at http://127.0.0.1:5173 and the Emulator UI at http://127.0.0.1:4000. To start just the emulators, use `pnpm emulators`

5. Make sure you pass the tests

   ```
   pnpm checks
   pnpm test:e2e
   ```

   If formatting fails, run `pnpm format`. To run one particular test, use `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`.

## Making a pull request

1. **Pick up an issue.** Issues will be assigned by Tech Leads. Every PR should map to a GitHub issue.

2. **Branch off `main`.**

   ```sh
   git checkout main && git pull
   git checkout -b <your-name>/<short-description>
   ```

   As you work, `pnpm test:watch` reruns unit tests on every save

3. **Run the checks and E2E tests.** Both must pass before you open the PR:

   ```sh
   pnpm checks
   pnpm test:e2e
   ```

   If the format check fails, run `pnpm format` to fix it. If an E2E test fails, `pnpm test:e2e:ui` opens Playwright's UI so you can step through it.

4. **Open the PR into `main`.** There exists a template to follow, make sure you follow it exactly so that we can map a PR to a Github Issue.

5. **Address every CodeRabbit comment.** Fix the ones that are right. If you
   think a comment is wrong, reply to it and explain why. Don't leave any
   comment without a fix or a reply.

6. **Request review.** Once CI is green and CodeRabbit's comments are handled,
   add **Joel** (@joelchem) and **Aarav** (@constrictingsnake) as reviewers, and update the tech leads in the private leadership chat.

7. **Respond to feedback.** Push fixes, re-request review, and merge once
   the PR is approved.

## Meet the team

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
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
      </a>
    </td>
    <td align="center" width="150">
      <a href="https://umd.hack4impact.org/">
        <img src="docs/team-photos/FILENAME" height="100" width="100" style="border-radius:50%;object-fit:cover;" alt="Name"/><br/>
        <b>Name</b><br/><br/>
        <img src="https://img.shields.io/badge/💻_engineer-27AE60?style=flat-square" alt="Engineer"/>
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
        <img src="https://img.shields.io/badge/🧑‍🏫_mentor-95A5A6?style=flat-square" alt="Mentor"/>
      </a>
    </td>
  </tr>
</table>
