import * as core from '@actions/core'
import * as path from 'path'
import {context, getOctokit} from '@actions/github'
import {GitCommandManager} from './git-command-manager'
import toSemver from 'to-semver'

function getOwnerAndRepository(): string[] {
  const githubRepository = process.env['GITHUB_REPOSITORY']
  if (!githubRepository) {
    throw new Error('GITHUB_REPOSITORY not defined')
  }
  const [owner, repository] = githubRepository.split('/')
  core.info(`owner: ${owner} repository: ${repository}`)
  return [owner, repository]
}

function getRepoPath(): string {
  let githubWorkspacePath = process.env['GITHUB_WORKSPACE']

  if (!githubWorkspacePath) {
    throw new Error('GITHUB_WORKSPACE not defined')
  }

  githubWorkspacePath = path.resolve(githubWorkspacePath)

  core.info(`githubWorkspacePath: ${githubWorkspacePath}`)

  return githubWorkspacePath
}

async function getFromBranch(git: GitCommandManager): Promise<string> {
  const symbolicRefResult = await git.exec(
    ['symbolic-ref', 'HEAD', '--short'],
    true
  )
  if (symbolicRefResult.exitCode === 0) {
    return symbolicRefResult.stdout.trim()
  } else {
    throw new Error('From branch cannot be determined')
  }
}

export async function getBranches(
  git: GitCommandManager,
  releaseBranchType: string
): Promise<string[]> {
  const branchsResult = await git.exec(['branch', '-r', '--list'], true)
  if (branchsResult.exitCode === 0) {
    return splitLines(branchsResult.stdout).filter(branch =>
      branch.includes(releaseBranchType)
    )
  } else {
    return new Array<string>()
  }
}

function splitLines(multilineString: string): string[] {
  return multilineString
    .split('\n')
    .map(s => s.trim())
    .filter(x => x !== '')
}

async function fetch(git: GitCommandManager): Promise<void> {
  await git.exec(['fetch', '--all'], true)
}

export function getToBranch(
  branches: string[],
  fromBranch: string,
  developBranch: string
): string {
  const versions: string[] = toSemver(branches)
  let nextBranch = ''
  const reversedVersions = versions.reverse()
  let nextVersionIndex = -1
  for (let index = 0; index < reversedVersions.length; index++) {
    const version = reversedVersions[index]
    if (fromBranch.includes(version)) {
      nextVersionIndex = index + 1
      break
    }
  }

  if (nextVersionIndex < reversedVersions.length && nextVersionIndex !== -1) {
    const nextVersion = reversedVersions[nextVersionIndex]
    for (const branch of branches) {
      if (branch.includes(nextVersion)) {
        nextBranch = branch.replace('origin/', '')
        break
      }
    }
  } else {
    nextBranch = developBranch
  }

  return nextBranch
}

const octokit = getOctokit(core.getInput('github_token'))

async function merge(from: string, to: string): Promise<string> {
  core.info(`Merge branch:${from} to: ${to}`)
  const response = await octokit.rest.repos.merge({
    ...context.repo,
    base: to,
    head: from
  })
  const newMasterSha = response.data.sha
  core.info(`Commit ${newMasterSha}`)
  return newMasterSha
}

async function run(): Promise<void> {
  try {
    const repoPath = getRepoPath()

    const [owner, repo] = getOwnerAndRepository()

    const releaseBranchType = core.getInput('release_branch_type')

    const developBranch = core.getInput('develop_branch')

    const git = await GitCommandManager.create(repoPath)

    const [fromBranch] = await getFromBranch(git)

    if (fromBranch.includes(releaseBranchType)) {
      await fetch(git)

      const branches = await getBranches(git, releaseBranchType)

      const existsDevelopBranch = branches.some(branch =>
        branch.includes(developBranch)
      )

      if (!existsDevelopBranch) {
        const toBranch = getToBranch(branches, fromBranch, developBranch)

        try {
          await merge(fromBranch, toBranch)
        } catch (error) {
          if (error instanceof Error)
            core.info(
              `Merge branch:${fromBranch} to: ${toBranch} failed:${error.message}`
            )

          const {data: currentPulls} = await octokit.rest.pulls.list({
            owner,
            repo
          })

          const currentPull = currentPulls.find(pull => {
            return pull.head.ref === fromBranch && pull.base.ref === toBranch
          })

          if (!currentPull) {
            const {data: response} = await octokit.rest.repos.compareCommits({
              owner,
              repo,
              base: toBranch,
              head: fromBranch,
              page: 1,
              per_page: 1
            })

            const hasContentDifference =
              response.files !== undefined && response.files.length > 0

            if (hasContentDifference) {
              const {data: pullRequest} = await octokit.rest.pulls.create({
                owner,
                repo,
                head: fromBranch,
                base: toBranch,
                title: `sync: ${fromBranch} to ${toBranch}`,
                body: `sync-branches: New code has just landed in ${fromBranch}, so let's bring ${toBranch} up to speed!`,
                draft: false
              })

              core.setOutput('time', new Date().toTimeString())
              /*if (reviewers.length > 0) {
                octokit.rest.pulls.requestReviewers({
                  owner,
                  repo,
                  pull_number: pullRequest.number,
                  reviewers
                })
              }*/
              core.info(
                `Pull request (${pullRequest.number}) successful! You can view it here: ${pullRequest.url}`
              )
            } else {
              core.info(
                `There is no content difference between ${fromBranch} and ${toBranch}.`
              )
            }
          } else {
            core.info(
              `There is already a pull request (${currentPull.number}) to ${toBranch} from ${fromBranch}. You can view it here: ${currentPull.url}`
            )
          }
        }
      } else {
        core.info(`Missing ${developBranch} branch`)
      }
    } else {
      core.info(
        `The branch ${fromBranch} is not a ${releaseBranchType} branch type`
      )
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
