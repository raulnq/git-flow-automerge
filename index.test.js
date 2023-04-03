const { tryToMerge, getTargetBranch } = require('./automerger.js')

test('tryToMerge_non_release_branch_type_should_be_skipped', async () => {
  const currentBranch = Promise.resolve('feature/ABC-123')

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch
  })

  expect(code).toBe('')
})

test('tryToMerge_with_missing_develop_should_be_skipped', async () => {
  const currentBranch = Promise.resolve('release/1.0.0')

  const branches = Promise.resolve([
    'feature/ABC-123',
    'release/1.0.0',
    'release/2.0.0'
  ])

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch,
    fetch: () => 0,
    listBranches: () => branches
  })

  expect(code).toBe('')
})

test('tryToMerge_with_available_target_branch_should_be_successfully', async () => {
  const currentBranch = Promise.resolve('release/1.0.0')

  const hash = Promise.resolve('0c2bbd29-4fca-4517-9721-e4f308ff8a87')

  const branches = Promise.resolve([
    'feature/ABC-123',
    'release/1.0.0',
    'release/2.0.0',
    'origin/develop'
  ])

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch,
    fetch: () => 0,
    listBranches: () => branches,
    token: '',
    merge: () => hash
  })

  expect(code).toBe('0c2bbd29-4fca-4517-9721-e4f308ff8a87')
})

test('tryToMerge_throws_an_merge_exception_with_active_pr_should_be_skipped', async () => {
  const currentBranch = Promise.resolve('release/1.0.0')

  const pullRequest = Promise.resolve({
    number: 1,
    url: 'url'
  })

  const mergeError = Promise.reject(new Error('merge error'))

  const branches = Promise.resolve([
    'feature/ABC-123',
    'release/1.0.0',
    'release/2.0.0',
    'origin/develop'
  ])

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch,
    fetch: () => 0,
    listBranches: () => branches,
    token: 'token',
    merge: () => mergeError,
    owner: 'owner',
    repo: 'repo',
    getCurrentPullRequest: () => pullRequest
  })

  expect(code).toBe('')
})

test('tryToMerge_throws_an_merge_exception_with_no_active_pr_and_no_content_differece_should_be_skipped', async () => {
  const currentBranch = Promise.resolve('release/1.0.0')

  const hasContentDifference = Promise.resolve(false)

  const mergeError = Promise.reject(new Error('merge error'))

  const branches = Promise.resolve([
    'feature/ABC-123',
    'release/1.0.0',
    'release/2.0.0',
    'origin/develop'
  ])

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch,
    fetch: () => 0,
    listBranches: () => branches,
    token: 'token',
    merge: () => mergeError,
    owner: 'owner',
    repo: 'repo',
    getCurrentPullRequest: () => null,
    hasContentDifference: () => hasContentDifference
  })

  expect(code).toBe('')
})

test('tryToMerge_throws_an_merge_exception_with_no_active_pr_and_content_differece_should_create_pull_request', async () => {
  const currentBranch = Promise.resolve('release/1.0.0')

  const hasContentDifference = Promise.resolve(true)

  const pullRequest = Promise.resolve({
    number: 1,
    url: 'url'
  })

  const mergeError = Promise.reject(new Error('merge error'))

  const branches = Promise.resolve([
    'feature/ABC-123',
    'release/1.0.0',
    'release/2.0.0',
    'origin/develop'
  ])

  var code = await tryToMerge({
    repoPath: 'repoPath',
    releaseBranchType: 'release',
    developBranch: 'develop',
    getCurrentBranch: () => currentBranch,
    fetch: () => 0,
    listBranches: () => branches,
    token: 'token',
    merge: () => mergeError,
    owner: 'owner',
    repo: 'repo',
    getCurrentPullRequest: () => null,
    hasContentDifference: () => hasContentDifference,
    createPullRequest: () => pullRequest
  })

  expect(code).toBe('url')
})

describe('getTargetBranch_should_match_expected_branch', () => {
  test.each([
    [
      [
        'origin/develop',
        'origin/feature/ABC-0001',
        'origin/release/1.0.0',
        'origin/release/2.0.0'
      ],
      'release/1.0.0',
      'release/2.0.0'
    ],
    [
      [
        'origin/develop',
        'origin/feature/ABC-0001',
        'origin/release/1.0.0',
        'origin/release/1.0.1',
        'origin/release/2.0.0'
      ],
      'release/1.0.0',
      'release/1.0.1'
    ],
    [
      [
        'origin/develop',
        'origin/feature/ABC-0001',
        'origin/release/1.0.0',
        'origin/release/1.1.0',
        'origin/release/2.0.0'
      ],
      'release/1.0.0',
      'release/1.1.0'
    ],
    [
      ['origin/develop', 'origin/feature/ABC-0001', 'origin/release/1.0.0'],
      'release/1.0.0',
      'develop'
    ],
    [
      [
        'origin/develop',
        'origin/release/1.40.0',
        'origin/release/1.40.1',
        'origin/release/1.40.2',
        'origin/release/1.40.3',
        'origin/release/1.40.4',
        'origin/release/1.40.5',
        'origin/release/1.40.6',
        'origin/release/1.40.7',
        'origin/release/1.40.8',
        'origin/release/1.40.9',
        'origin/release/1.40.10'
      ],
      'release/1.40.10',
      'develop'
    ],
    [
      [
        'origin/develop',
        'origin/release/1.40.0',
        'origin/release/1.40.1',
        'origin/release/1.40.2',
        'origin/release/1.40.3',
        'origin/release/1.40.4',
        'origin/release/1.40.5',
        'origin/release/1.40.6',
        'origin/release/1.40.7',
        'origin/release/1.40.8',
        'origin/release/1.40.9',
        'origin/release/1.40.10',
        'origin/release/1.40.11'
      ],
      'release/1.40.10',
      'release/1.40.11'
    ]
  ])('test %s - %s - %s', (branches, currentBranch, target) => {
    var branch = getTargetBranch(branches, currentBranch, 'develop')

    expect(branch).toBe(target)
  })
})
