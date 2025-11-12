import { Transform, type TransformCallback } from "stream";
import { stringify } from "./stringify";

export function transformStreamToSimplifiedJson(): Transform {
  let isFirstElement = true;

  return new Transform({
    objectMode: true,

    transform(
      row: any,
      encoding: BufferEncoding, // eslint-disable-line no-unused-vars
      callback: TransformCallback,
    ): void {
      if (isFirstElement) {
        this.push("["); // Push the opening bracket for the first element
        isFirstElement = false; // Reset the flag after the first element
      } else {
        this.push(","); // For subsequent elements, prepend a comma
      }

      // Transform the row to simplified format
      const simplifiedRow = transformToSimplifiedFormat(row);
      this.push(stringify(simplifiedRow)); // Push the current row as a JSON string

      callback();
    },

    // 'final' is called when there is no more data to be consumed, but before the stream is finished.
    final(callback: TransformCallback): void {
      if (isFirstElement) {
        // If no rows were processed, the opening bracket has not been pushed yet.
        this.push("[]"); // Push an empty array to ensure valid JSON.
      } else {
        this.push("]"); // Close JSON array
      }

      callback();
    },
  });
}

function transformToSimplifiedFormat(row: any): any {
  // Extract filename from metadata or use a default
  const filename = extractFilename(row);

  // Extract page number from metadata or use 1 as default
  const page = extractPageNumber(row);

  // Extract question from input or use a default
  const question = extractQuestion(row);

  // Extract answer from output or expected output
  const answer = extractAnswer(row);

  return {
    filename,
    page,
    question,
    answer,
  };
}

function extractFilename(row: any): string {
  // 按照要求：从 output.metadata.retriever_resources[0].document_name 获取
  try {
    // 首先尝试从 datasetItemExpectedOutput 中获取
    if (row.datasetItemExpectedOutput) {
      let outputData: any = null;

      // 如果是字符串，尝试解析为JSON
      if (typeof row.datasetItemExpectedOutput === "string") {
        try {
          outputData = JSON.parse(row.datasetItemExpectedOutput);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.datasetItemExpectedOutput === "object") {
        outputData = row.datasetItemExpectedOutput;
      }

      // 检查 output.metadata.retriever_resources[0].document_name
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].document_name
      ) {
        return outputData.metadata.retriever_resources[0].document_name;
      }
    }

    // 尝试从实际的 output 字段获取
    if (row.output) {
      let outputData: any = null;

      if (typeof row.output === "string") {
        try {
          outputData = JSON.parse(row.output);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.output === "object") {
        outputData = row.output;
      }

      // 检查 output.metadata.retriever_resources[0].document_name
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].document_name
      ) {
        return outputData.metadata.retriever_resources[0].document_name;
      }
    }

    // 尝试从 observationOutput 获取
    if (row.observationOutput) {
      let outputData: any = null;

      if (typeof row.observationOutput === "string") {
        try {
          outputData = JSON.parse(row.observationOutput);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.observationOutput === "object") {
        outputData = row.observationOutput;
      }

      // 检查 output.metadata.retriever_resources[0].document_name
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].document_name
      ) {
        return outputData.metadata.retriever_resources[0].document_name;
      }
    }

    // 尝试从其他可能的位置获取
    if (row.datasetItemMetadata?.filename) {
      return row.datasetItemMetadata.filename;
    }

    if (row.datasetRunMetadata?.filename) {
      return row.datasetRunMetadata.filename;
    }

    if (row.metadata?.filename) {
      return row.metadata.filename;
    }

    // Try to extract from input if it's an object
    if (row.datasetItemInput && typeof row.datasetItemInput === "object") {
      if (row.datasetItemInput.filename) {
        return row.datasetItemInput.filename;
      }
      if (row.datasetItemInput.file) {
        return row.datasetItemInput.file;
      }
    }
  } catch (error) {
    console.error("Error extracting filename:", error);
  }

  // Default filename
  return "unknown.pdf";
}

function extractPageNumber(row: any): number {
  // 按照要求：从 output.metadata.retriever_resources[0].page 获取
  try {
    // 首先尝试从 datasetItemExpectedOutput 中获取
    if (row.datasetItemExpectedOutput) {
      let outputData: any = null;

      if (typeof row.datasetItemExpectedOutput === "string") {
        try {
          outputData = JSON.parse(row.datasetItemExpectedOutput);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.datasetItemExpectedOutput === "object") {
        outputData = row.datasetItemExpectedOutput;
      }

      // 检查 output.metadata.retriever_resources[0].page
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].page
      ) {
        const page = parseInt(
          outputData.metadata.retriever_resources[0].page,
          10,
        );
        return page > 0 ? page : 1;
      }
    }

    // 尝试从实际的 output 字段获取
    if (row.output) {
      let outputData: any = null;

      if (typeof row.output === "string") {
        try {
          outputData = JSON.parse(row.output);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.output === "object") {
        outputData = row.output;
      }

      // 检查 output.metadata.retriever_resources[0].page
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].page
      ) {
        const page = parseInt(
          outputData.metadata.retriever_resources[0].page,
          10,
        );
        return page > 0 ? page : 1;
      }
    }

    // 尝试从 observationOutput 获取
    if (row.observationOutput) {
      let outputData: any = null;

      if (typeof row.observationOutput === "string") {
        try {
          outputData = JSON.parse(row.observationOutput);
        } catch (e) {
          // 如果解析失败，继续尝试其他方式
        }
      } else if (typeof row.observationOutput === "object") {
        outputData = row.observationOutput;
      }

      // 检查 output.metadata.retriever_resources[0].page
      if (
        outputData?.metadata?.retriever_resources &&
        Array.isArray(outputData.metadata.retriever_resources) &&
        outputData.metadata.retriever_resources.length > 0 &&
        outputData.metadata.retriever_resources[0] &&
        outputData.metadata.retriever_resources[0].page
      ) {
        const page = parseInt(
          outputData.metadata.retriever_resources[0].page,
          10,
        );
        return page > 0 ? page : 1;
      }
    }

    // 尝试从其他可能的位置获取
    if (row.datasetItemMetadata?.page) {
      return parseInt(row.datasetItemMetadata.page, 10) || 1;
    }

    if (row.datasetRunMetadata?.page) {
      return parseInt(row.datasetRunMetadata.page, 10) || 1;
    }

    if (row.metadata?.page) {
      return parseInt(row.metadata.page, 10) || 1;
    }

    // Try to extract from input if it's an object
    if (row.datasetItemInput && typeof row.datasetItemInput === "object") {
      if (row.datasetItemInput.page) {
        return parseInt(row.datasetItemInput.page, 10) || 1;
      }
    }
  } catch (error) {
    console.error("Error extracting page number:", error);
  }

  // Default page number
  return 1;
}

function extractQuestion(row: any): string {
  // Try to extract question from input
  if (row.datasetItemInput) {
    if (typeof row.datasetItemInput === "string") {
      return row.datasetItemInput;
    }

    if (typeof row.datasetItemInput === "object") {
      if (row.datasetItemInput.question) {
        return row.datasetItemInput.question;
      }
      if (row.datasetItemInput.query) {
        return row.datasetItemInput.query;
      }
      if (row.datasetItemInput.prompt) {
        return row.datasetItemInput.prompt;
      }
      // If it's an object, try to stringify it
      return JSON.stringify(row.datasetItemInput);
    }
  }

  // Try to extract from other fields
  if (row.input) {
    if (typeof row.input === "string") {
      return row.input;
    }
    if (typeof row.input === "object") {
      if (row.input.question) {
        return row.input.question;
      }
      if (row.input.query) {
        return row.input.query;
      }
      if (row.input.prompt) {
        return row.input.prompt;
      }
      return JSON.stringify(row.input);
    }
  }

  // Default question
  return "No question available";
}

function extractAnswer(row: any): string {
  // Try to extract answer from output first
  if (row.datasetItemExpectedOutput) {
    if (typeof row.datasetItemExpectedOutput === "string") {
      return row.datasetItemExpectedOutput;
    }
    if (typeof row.datasetItemExpectedOutput === "object") {
      if (row.datasetItemExpectedOutput.answer) {
        return row.datasetItemExpectedOutput.answer;
      }
      if (row.datasetItemExpectedOutput.response) {
        return row.datasetItemExpectedOutput.response;
      }
      if (row.datasetItemExpectedOutput.output) {
        return row.datasetItemExpectedOutput.output;
      }
      return JSON.stringify(row.datasetItemExpectedOutput);
    }
  }

  // Try to extract from actual output if available
  if (row.output) {
    if (typeof row.output === "string") {
      return row.output;
    }
    if (typeof row.output === "object") {
      if (row.output.answer) {
        return row.output.answer;
      }
      if (row.output.response) {
        return row.output.response;
      }
      if (row.output.content) {
        return row.output.content;
      }
      return JSON.stringify(row.output);
    }
  }

  // Try to extract from observation output
  if (row.observationOutput) {
    if (typeof row.observationOutput === "string") {
      return row.observationOutput;
    }
    if (typeof row.observationOutput === "object") {
      if (row.observationOutput.answer) {
        return row.observationOutput.answer;
      }
      if (row.observationOutput.response) {
        return row.observationOutput.response;
      }
      if (row.observationOutput.content) {
        return row.observationOutput.content;
      }
      return JSON.stringify(row.observationOutput);
    }
  }

  // Default answer
  return "No answer available";
}
