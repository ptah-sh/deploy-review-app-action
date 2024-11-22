const core = require("@actions/core");
const github = require("@actions/github");
const { HttpClient } = require("@actions/http-client");
const yaml = require("js-yaml");

function validateInputs({ service, ref, refUrl, process, worker }) {
  if (typeof service !== 'string' || service.trim() === '') {
    throw new Error(`Service must be a non-empty string`);
  }

  if (typeof ref !== 'string' || ref.trim() === '') {
    throw new Error(`Ref must be a non-empty string`);
  }

  if (typeof refUrl !== 'string' || refUrl.trim() === '') {
    throw new Error(`Ref URL must be a non-empty string`);
  }

  if (typeof process !== 'object' || process === null) {
    throw new Error(`Process must be an object`);
  }

  if (typeof process.name !== 'string' || process.name.trim() === '') {
    throw new Error(`Process must have a non-empty 'name' string property`);
  }

  if (typeof worker !== 'object' || worker === null) {
    throw new Error(`Worker must be an object`);
  }

  if (typeof worker.name !== 'string' || worker.name.trim() === '') {
    throw new Error(`Worker must have a non-empty 'name' string property`);
  }
}

async function run() {
  try {
    const githubToken = core.getInput("githubToken", { required: true });
    const apiKey = core.getInput("apiKey", { required: true });
    const service = core.getInput("service", { required: true });
    const ref = core.getInput("ref", { required: true });
    const refUrl = core.getInput("refUrl", { required: true });
    const processesYamlString = core.getInput("process", { required: true });
    const workerYamlString = core.getInput("worker", { required: true });
    const serverAddress = core.getInput("serverAddress") || "https://ctl.ptah.sh";

    const process = yaml.load(processesYamlString);
    const worker = yaml.load(workerYamlString);

    validateInputs({ service, ref, refUrl, process, worker });

    console.log(`Deploying review app for service: ${service}`);

    // Prepare the request payload
    const payload = {
      meta: {
        ref,
        refUrl
      },
      process,
      worker
    };

    // Make the API call
    const http = new HttpClient('ptah-deploy-action');
    try {
      const response = await http.postJson(
        `${serverAddress}/api/v0/services/${service}/review-apps`,
        payload,
        {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      );

      if (response.statusCode !== 200) {
        throw new Error(`API call failed with status ${response.statusCode}`);
      }

      const responseData = response.result;
      console.log("Review app deployment initiated successfully");
      console.log("API Response:", responseData);


      const reviewAppsPageUrl = `${serverAddress}/services/${service}/review-apps`;
      const visitUrl = responseData.review_app.visit_url;

      console.log(`Review app deployment initiated successfully. Link: ${reviewAppsPageUrl}`);
      console.log(`Visit: ${visitUrl}`);

      const octokit = github.getOctokit(githubToken);

      const comments = await octokit.rest.issues.listComments({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: github.context.issue.number,
        page: 1,
        per_page: 30
      });

      const title = `Ptah.sh Review Apps`;

      const comment = comments.data.find(comment => comment.body.includes(title));

      if (comment) {
        await octokit.rest.issues.updateComment({
          comment_id: comment.id,
          body: formatComment(title, visitUrl)
        });
      } else {
        await octokit.rest.issues.createComment({
          issue_number: github.context.issue.number,
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          body: formatComment(title, visitUrl)
        });
      }
    } catch (error) {
      console.error("API Error:", error.message);
      throw new Error(`API call failed: ${error.message}`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

function formatComment(title, visitUrl) {
  return `# ${title}\n\n${visitUrl}`;
}

run();
