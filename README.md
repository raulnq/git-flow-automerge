# Gitflow automerge

This action helps you to merge a `release` branch to the next one (or `develop` if there is no `release` branch). We are only considering `release` branches that are following [semantic versioning](https://semver.org/) guidelines. If you're using [gitflow-workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) on your project, this action will help you to keep all your `release` branches up to date.

**Note**: If you want to trigger new workflows using merges created by this action, you should do the following

- Don't use a default `GITHUB_TOKEN` token.
- Use a [Personal Access Token (PAT)](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) created on an account that has write access to the repository. 
- Add a secret in your repository with the PAT (example: `${{ secrets.REPO_SCOPED_TOKEN }}`). 
 
The same applies if you have protection rules over your `release` branches that you want to by pass during merge.

## Usage

```yaml
    - uses: actions/checkout@v2
    - name: Merge
      uses: raulnq/git-flow-automerge@v0.3.0
      with:
        ### GITHUB_TOKEN.(required)
        github_token: ${{ secrets.GITHUB_TOKEN }}

        ### branch type name. default: release (optional).
        release_branch_type: 'release'

        ### develop branch name. default: develop (optional).
        develop_branch: 'develop'
```