import {
  FormFieldComponentProps,
  FormComponentProps,
  FieldType,
} from "@fabrix-framework/fabrix";
import { Switch, Input, Stack, Button, Box } from "@chakra-ui/react";
import { Select } from "chakra-react-select";
import { useController } from "@fabrix-framework/fabrix/rhf";
import { LabelledHeading } from "./shared";

export const ChakraForm = (props: FormComponentProps) => {
  return (
    <Box className={props.className} rowGap={"20px"}>
      {props.renderFields()}
      {props.renderSubmit(({ submit, isSubmitting }) => (
        <Button
          className="col-12"
          colorScheme="blue"
          marginTop={2}
          isDisabled={isSubmitting}
          onClick={() => submit()}
        >
          Submit
        </Button>
      ))}
    </Box>
  );
};

export const ChakraFormField = (props: FormFieldComponentProps) => {
  switch (props.type?.type) {
    case "Scalar": {
      switch (props.type.name) {
        case "Number":
          return <NumberFormField {...props} />;
        case "Boolean":
          return <BooleanFormField {...props} />;
        default:
          return <TextFormField {...props} />;
      }
    }
    case "Enum":
      return <SelectFormField {...props} type={props.type} />;
    case "List": {
      const innerType = props.type.innerType;
      switch (innerType.type) {
        case "Enum":
          return <MultiSelectFormField {...props} type={innerType} />;
        default:
          return <TextFormField {...props} />;
      }
    }
    default:
      return <TextFormField {...props} />;
  }
};

type EnumFieldType = Extract<FieldType, { type: "Enum" }>;

const MultiSelectFormField = (
  props: FormFieldComponentProps & { type: EnumFieldType },
) => {
  const { className } = props.attributes;
  const { field } = useController({
    name: props.name,
  });
  const values = props.type.meta.values.map((value) => ({
    value,
    label: value,
  }));

  return (
    <Stack className={className} spacing={2}>
      <LabelledHeading {...props} />
      <Select
        isMulti
        options={values}
        name={field.name}
        ref={field.ref}
        onBlur={field.onBlur}
        onChange={(e) => field.onChange(e.map(({ value }) => value))}
      />
    </Stack>
  );
};

const SelectFormField = (
  props: FormFieldComponentProps & { type: EnumFieldType },
) => {
  const { className } = props.attributes;
  const { field } = useController({
    name: props.name,
  });
  const values = props.type.meta.values.map((value) => ({
    value,
    label: value,
  }));

  return (
    <Stack className={className} spacing={2}>
      <LabelledHeading {...props} />
      <Select
        options={values}
        name={field.name}
        ref={field.ref}
        onBlur={field.onBlur}
        onChange={(e) => e && field.onChange(e.value)}
      />
    </Stack>
  );
};

const TextFormField = (props: FormFieldComponentProps) => {
  const { attributes } = props;
  const { field } = useController({
    name: props.name,
  });

  return (
    <Stack className={attributes.className} spacing={2}>
      <LabelledHeading {...props} />
      <Input {...field} placeholder="Enter value" />
    </Stack>
  );
};

const NumberFormField = (props: FormFieldComponentProps) => {
  const { className } = props.attributes;
  const { field } = useController({
    name: props.name,
  });

  return (
    <Stack className={className} spacing={2}>
      <LabelledHeading {...props} />
      <Input {...field} type="number" placeholder="Enter value" />
    </Stack>
  );
};

const BooleanFormField = (props: FormFieldComponentProps) => {
  const { className } = props.attributes;
  const { field } = useController({
    name: props.name,
  });

  return (
    <Stack className={className} spacing={2}>
      <LabelledHeading {...props} />
      <Switch {...field} size="lg" />
    </Stack>
  );
};