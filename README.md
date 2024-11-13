# Deploy Review App to Ptah.sh

This GitHub Action launches a new review app deployment to the Docker Swarm cluster managed by Ptah.sh.

## Inputs

### `apiKey`

**Required** The API Key for authentication with Ptah.sh.

### `service`

**Required** The slug of the service to deploy.

### `ref`

**Required** The reference to the branch, commit or pull request.

### `refUrl`

**Required** The URL to the reference.

### `process`

**Required** YAML object containing process configuration.

### `worker`

**Required** YAML object containing worker configuration.

### `serverAddress`

**Optional** Custom server address. Default is "https://ctl.ptah.sh".

## Example Usage

```yaml
name: Deploy Review App to Ptah.sh
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: docker build -t my-service:${{ github.sha }} .

    - name: Push Docker image
      run: docker push my-service:${{ github.sha }}

    - name: Deploy Review App to Ptah.sh
      uses: ptah-sh/deploy-action@v1
      with:
        apiKey: ${{ secrets.PTAH_API_KEY }}
        service: 'my-service-slug'
        ref: ${{ github.ref }}
        refUrl: ${{ github.event.pull_request.html_url }}
        process: |
          name: web
          envVars:
            - name: ENVIRONMENT
              value: review
        worker: |
          name: main
          dockerImage: my-service:${{ github.sha }}

```

## Process and Worker Configuration

The `process` input should be a YAML object with the following properties:
- `name` (required): The name of the process
- `envVars` (optional): An array of environment variables. Each variable should have:
  - `name`: The environment variable name
  - `value`: The environment variable value

The `worker` input should be a YAML object with the following properties:
- `name` (required): The name of the worker
- `dockerImage` (optional): The Docker image to use for this worker

## Features

- Automatically creates or updates a comment in the pull request with the review app URL
- Validates all required inputs before making the API call
- Provides detailed error messages if deployment fails

## Error Handling

The action will fail if:
- Any required input is missing or invalid
- The process or worker YAML is invalid
- The API call to Ptah.sh fails

When the action fails, it will output an error message describing the problem.

## Development

To test the action locally, you can use the following command:

```bash
INPUT_PROCESS=$(cat <<EOF
name: web
envVars:
  - name: ENVIRONMENT
    value: review
EOF
)

INPUT_WORKER=$(cat <<EOF
name: main
dockerImage: your-service:latest
EOF
)

INPUT_API_KEY=your_api_key \
INPUT_SERVICE=your-service-slug \
INPUT_REF=refs/heads/main \
INPUT_REF_URL=https://github.com/owner/repo/pull/1 \
INPUT_PROCESS="$INPUT_PROCESS" \
INPUT_WORKER="$INPUT_WORKER" \
INPUT_SERVER_ADDRESS=https://custom.ptah.sh \
node index.js
```