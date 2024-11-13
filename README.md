# Deploy Service to Ptah.sh

This GitHub Action launches a new deployment to the Docker Swarm cluster managed by Ptah.sh.

## Inputs

### `apiKey`

**Required** The API Key for authentication with Ptah.sh.

### `service`

**Required** The slug of the service to deploy.

### `processes`

**Required** A YAML array containing process configurations for the deployment.

### `serverAddress`

**Optional** Custom server address. Default is "https://ctl.ptah.sh".

## Outputs

### `deploymentId`

The ID of the initiated deployment.

## Example Usage

```yaml
name: Deploy to Ptah.sh
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build Docker image
      run: docker build -t my-service:${{ github.sha }} .

    - name: Push Docker image
      run: docker push my-service:${{ github.sha }}

    - name: Deploy to Ptah.sh
      uses: ptah-sh/deploy-action@v1
      with:
        apiKey: ${{ secrets.PTAH_API_KEY }}
        service: 'my-service-slug'
        processes: |
          - name: svc
            workers:
              - name: main
                dockerImage: my-service:${{ github.sha }}
            envVars:
              - name: SENTRY_VERSION
                value: ${{ github.sha }}
      id: deploy
    - name: Get the deployment ID
      run: echo "The deployment ID is ${{ steps.deploy.outputs.deploymentId }}"
```

## Process Configuration

The `processes` input should be a YAML array where each item represents a process to be deployed. Each process can have the following properties:

- `name` (required): The name of the process.
- `workers` (optional): An array of worker configurations. Each worker should have a `name` and a `dockerImage` (optional).
- `envVars` (optional): An array of environment variables for the process. Each environment variable should have a `name` and a `value`.

## Error Handling

The action will fail if:

- The input YAML for processes is invalid.
- The processes array is empty.
- Any process doesn't meet the validation criteria.
- The API call to Ptah.sh fails.

When the action fails, it will output an error message describing the problem.

## Development

To test the action locally, you can use the following command:

```bash
INPUT_PROCESSES=$(cat <<EOF
- name: web
  workers:
    - name: main
      dockerImage: your-service:latest
  envVars:
    - name: ENV
      value: production
EOF
)

INPUT_API_KEY=your_api_key INPUT_SERVICE=your-service-slug INPUT_PROCESSES="$INPUT_PROCESSES" INPUT_SERVER_ADDRESS=https://custom.ptah.sh node index.js
```