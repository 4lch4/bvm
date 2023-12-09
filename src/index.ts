#!/usr/bin/env bun

import { readPackageJSON } from '@4lch4/backpack/utils'
import Chalk from 'chalk'
import { Argument, Command, program } from 'commander'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getLatestVersions } from './gh'

/**
 * Parses the given version number, if it exists, into a format that can be used by the
 * `install-bun` script provided by Bun. The following is how each type of version number is
 * parsed:
 *
 * - bun-v#.#.#: Returns the version number as-is.
 * - v#.#.#: Converts it to bun-v#.#.#.
 * - #.#.#: Converts it to bun-v#.#.#.
 * - #.#: Converts it to bun-v1.#.#.
 * - latest: Returns undefined.
 *
 * @param version The version number to parse.
 * @returns The version number to use for the install command.
 */
function parseVersion(version?: string) {
  // If it's already in the expected format of bun-v#.#.#, return it.
  if (version?.match(/^bun-v\d+\.\d+\.\d+$/)) return version

  // If it's in the format of v#.#.#, convert it to bun-v#.#.#.
  if (version?.match(/^v\d+\.\d+\.\d+$/)) return `bun-${version}`

  // If it's in the format of #.#.#, convert it to bun-v#.#.#.
  if (version?.match(/^\d+\.\d+\.\d+$/)) return `bun-v${version}`

  // If it's in the format of #.#, convert it to bun-v1.#.#.
  if (version?.match(/^\d+\.\d+$/)) return `bun-v1.${version}`

  if (version?.toLowerCase() === 'latest') return undefined

  // Otherwise, return the version as-is.
  return version
}

async function setup(): Promise<Command> {
  // const __dirname = dirname(fileURLToPath(import.meta.url))
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..')
  const pkg = await readPackageJSON(join(pkgDir, 'package.json'))

  if (pkg && pkg.name && pkg.version && pkg.description) {
    const versionArg = new Argument('[version]', 'The version of Bun to switch to.')
      // Try and parse the version number argument into something like bun-v1.0.0.
      .argParser(parseVersion)

    const listCommand = new Command('list')
      .description('List the released versions of Bun.')
      .action(async () => {
        console.log('Listing versions...')

        const rawVersions = await getLatestVersions()
        const versions: string[] = []

        for (let x = 0; x < rawVersions.length; x++) {
          const version = rawVersions[x]

          if (version.startsWith('v0') && rawVersions[x - 1].startsWith('v1'))
            versions.push('--------')

          versions.push(`- ${Chalk.bold(version)}`)
        }

        console.log(versions.join('\n'))
      })

    return program
      .name(pkg.name)
      .version(pkg.version)
      .description(pkg.description)
      .addArgument(versionArg)
      .addCommand(listCommand)
      .action(async (version: string) => {
        const { stderr } = Bun.spawn({ cmd: ['install-bun', version] })

        if (stderr) console.error(`Error: ${stderr}`)
        // if (stdout) console.log(`[index]: ${stdout}`)
        // console.log(`[index]: versionArg: ${version}`)
      })
  } else {
    const errMsg = 'package.json was not able to be read.'
    console.error(`[index]: ${errMsg}`)

    throw new Error(errMsg)
  }
}

try {
  const app = await setup()

  app.parse(process.argv)
} catch (error) {
  console.error('[index]: Following error caught when setting up program.')
  console.error(error)
}
