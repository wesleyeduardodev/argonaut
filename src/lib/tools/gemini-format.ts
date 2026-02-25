import { ARGOCD_TOOLS } from "./definitions";
import { Type, type FunctionDeclaration, type Schema } from "@google/genai";

const TYPE_MAP: Record<string, Type> = {
  string: Type.STRING,
  number: Type.NUMBER,
  boolean: Type.BOOLEAN,
  object: Type.OBJECT,
  array: Type.ARRAY,
};

export function getGeminiTools(): FunctionDeclaration[] {
  return ARGOCD_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, val]) => [
          key,
          {
            type: TYPE_MAP[val.type] || Type.STRING,
            description: val.description,
          } as Schema,
        ])
      ),
      required: tool.parameters.required,
    },
  }));
}
