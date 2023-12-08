import { Octokit } from '@octokit/core'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import fs from 'fs-extra'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const OctokitWithPlugins = Octokit.plugin(paginateRest)
const gh = new OctokitWithPlugins()

export async function getLatestVersions() {
  const res = await gh.paginate('GET /repos/{owner}/{repo}/releases', {
    owner: 'oven-sh',
    repo: 'bun',
    per_page: 100,
  })

  return res
    .filter(release => release.tag_name && release.tag_name.startsWith('bun-v'))
    .map(release => release.tag_name!.replace('bun-', ''))
}

export async function getReleaseVersions(update: boolean = false) {
  try {
    const savedVersionsPath = join(__dirname, '..', 'bun-versions.txt')

    if (!(await fs.pathExists(savedVersionsPath)) || update) {
      const latestVersions = await getLatestVersions()

      await fs.writeFile(savedVersionsPath, latestVersions.join('\n'))

      return latestVersions
    } else {
      const fileContent = await Bun.file(savedVersionsPath).text()

      return fileContent.split('\n')
    }
  } catch (error) {
    throw error
  }
}
