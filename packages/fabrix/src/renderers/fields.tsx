import { createElement, useCallback, useContext, useMemo } from "react";
import { FabrixContext, FabrixContextType } from "@context";
import { Value } from "../fetcher";
import {
  assertObjectValue,
  buildClassName,
  CommonFabrixComponentRendererProps,
  FieldConfigByType,
  getFieldConfigByKey,
  resolveFieldTypesFromTypename,
} from "./shared";

export type ViewFields = FieldConfigByType<"view">["configs"]["fields"];
type ViewField = ViewFields[number];

export const ViewRenderer = ({
  context,
  rootField,
  componentFieldsRenderer,
  className,
}: CommonFabrixComponentRendererProps<ViewFields>) => {
  // If the query is the one that can be rendered as a table, we will render the table component instead of the fields.
  const tableType = useMemo(() => {
    if (rootField.fields.some((f) => f.field.getName() === "collection")) {
      return "standard" as const;
    } else if (rootField.fields.some((f) => f.field.getName() === "edges")) {
      return "relay" as const;
    }

    return null;
  }, []);

  const renderFields = useCallback(() => {
    if (componentFieldsRenderer) {
      return componentFieldsRenderer({
        getField: (name, extraProps) => {
          const field = getFieldConfigByKey(rootField.fields, name);
          if (!field) {
            return null;
          }

          return renderField({
            rootField,
            extraClassName: extraProps?.className,
            indexKey: extraProps?.key ?? `${rootField.name}-${name}`,
            subFields: getSubFields(
              context,
              rootField.data,
              rootField.fields,
              name,
            ),
            field: {
              ...field,
              ...extraProps,
            },
          });
        },
      });
    }

    const fieldsComponent = rootField.fields
      .sort((a, b) => (a.config.index ?? 0) - (b.config.index ?? 0))
      .flatMap((field, fieldIndex) => {
        const name = field.field.getName();
        if (name.startsWith("_")) {
          // Ignore __typename
          return [];
        }

        return renderField({
          rootField,
          indexKey: `${rootField.name}-${fieldIndex}`,
          subFields: getSubFields(
            context,
            rootField.data,
            rootField.fields,
            name,
          ),
          field,
        });
      });

    return (
      <div className={`fabrix fields col-row ${className ?? ""}`}>
        {fieldsComponent}
      </div>
    );
  }, [componentFieldsRenderer, rootField, getSubFields]);

  return tableType !== null
    ? renderTable(context, rootField.data, rootField.fields, tableType)
    : renderFields();
};

/**
 * Get the type name of the given field by looking at the __typename field.
 */
const getTypeName = (
  context: FabrixContextType,
  rootValue: Value | undefined,
  name: string,
) => {
  if (Array.isArray(rootValue)) {
    return resolveFieldTypesFromTypename(context, rootValue[0][name]);
  } else if (typeof rootValue?.[name] === "object") {
    return resolveFieldTypesFromTypename(context, rootValue?.[name]);
  } else {
    return {};
  }
};

/**
 * Get the sub fields of the given field.
 *
 * This also sorts the fields by the index value.
 */
const getSubFields = (
  context: FabrixContextType,
  rootValue: Value | undefined,
  fields: ViewFields,
  name: string,
) =>
  // filters fields by parent key and maps the filtered values to the array of SubField
  fields
    .filter((f) => f.field.getParent()?.asKey() === name)
    .sort((a, b) => (a.config.index ?? 0) - (b.config.index ?? 0))
    .map((value) => ({
      value,
      type:
        getTypeName(context, rootValue, name)[value.field.getName()] || null,
      label: value.config.label || value.field.getName(),
    }));

const renderTable = (
  context: FabrixContextType,
  rootValue: Value | undefined,
  fields: ViewFields,
  tableMode: "standard" | "relay",
) => {
  if (!rootValue || !("collection" in rootValue)) {
    return;
  }

  const values = rootValue.collection;
  if (!Array.isArray(values)) {
    return;
  }

  const renderStandardTable = () => {
    const subFields = getSubFields(context, rootValue, fields, "collection");
    const headers = subFields.flatMap((subField) => {
      if (subField.value.config.hidden) {
        return [];
      }

      // TODO: fallback to default table cell component
      const component = subField.value.config.componentType?.name
        ? context.componentRegistry.getCustom(
            subField.value.config.componentType.name,
            "tableCell",
          )
        : null;

      const userProps = subField.value.config.componentType?.props?.reduce(
        (acc, prop) => {
          return {
            ...acc,
            [prop.name]: prop.value,
          };
        },
        {},
      );

      const key = subField.value.field.getName();
      const cellRenderer = component
        ? (rowValue: Record<string, unknown>) => {
            return createElement(component, {
              key,
              name: key,
              type: null,
              value: rowValue,
              attributes: {
                className: "",
                label: subField.label,
              },
              userProps,
            });
          }
        : null;

      return {
        label: subField.label,
        key: subField.value.field.getName(),
        type: subField.type,
        render: cellRenderer,
      };
    });

    const tableComponent = context.componentRegistry.components.default?.table;
    if (!tableComponent) {
      return;
    }

    return createElement(tableComponent, {
      headers,
      values,
    });
  };

  const renderRelayTable = () => {
    return <div>WARN: Relay style table renderer is not supported for now</div>;
  };

  return (
    <div className={"fabrix table"}>
      {tableMode === "standard" ? renderStandardTable() : renderRelayTable()}
    </div>
  );
};

export type SubField = ReturnType<typeof getSubFields>[number];

type RenderFieldProps = {
  rootField: CommonFabrixComponentRendererProps<ViewFields>["rootField"];
  indexKey: string;
  field: ViewField;
  subFields: Array<SubField>;
  extraClassName?: string;
};
const renderField = ({
  rootField,
  field,
  subFields,
  indexKey,
  extraClassName,
}: RenderFieldProps) => {
  const context = useContext(FabrixContext);
  if (field.config.hidden) {
    return;
  }

  const fieldName = field.field.getName();
  const fieldType = rootField.type?.[fieldName];

  assertObjectValue(rootField.data);

  const component = field.config.componentType?.name
    ? context.componentRegistry.getCustom(
        field.config.componentType.name,
        "field",
      )
    : context.componentRegistry.components.default?.field;
  if (!component) {
    return;
  }

  const userProps = field.config.componentType?.props?.reduce((acc, prop) => {
    return {
      ...acc,
      [prop.name]: prop.value,
    };
  }, {});

  const className = buildClassName(field.config, extraClassName);
  return createElement(component, {
    key: indexKey,
    name: field.field.asKey(),
    path: field.field.value,
    value: rootField.data?.[fieldName] ?? "-",
    type: fieldType,
    subFields: subFields.map((subField) => ({
      key: subField.value.field.getName(),
      label: subField.label,
      type: subField.type,
    })),
    attributes: {
      className,
      label: field.config.label,
    },
    userProps,
  });
};
