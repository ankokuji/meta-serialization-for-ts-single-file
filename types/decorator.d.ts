export type GlobalStorage = GlobalStorageItem[];

interface GlobalStorageItem {
  className: string;
  decorators: DecoratorDescriptor[];
  members: any[];
}

interface DecoratorDescriptor {
  name: string;
  augList: DecoratorDescriptorAug[];
}

type DecoratorDescriptorAug =
  | DecoratorDescriptorLiteralContent
  | DecoratorDescriptorEnumContent
  | DecoratorDescriptorChainContent
  | DecoratorDescriptorObjectContent
  | DecoratorDescriptorNullContent
  | DecoratorDescriptorErrorContent
  | DecoratorDescriptorIdentifierContent;

type DecoratorDescriptorLiteralContent = {
  type: "literal";
  value: string;
};

type DecoratorDescriptorIdentifierContent = {
  type: "identifier";
  value: string;
}

type DecoratorDescriptorEnumContent = {
  type: "property";
  value: number | string;
};

type DecoratorDescriptorObjectContent = {
  type: "object";
  value: any;
}

type DecoratorDescriptorChainContent = {
  type: "propertyAccessRaw";
  value: string[];
};

type DecoratorDescriptorNullContent = {
  type: "null";
}

type DecoratorDescriptorErrorContent = {
  type: "error";
  value: string;
}
