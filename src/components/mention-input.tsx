import React, {
  FC,
  MutableRefObject,
  useMemo,
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  NativeSyntheticEvent,
  Text,
  TextInput,
  TextInputSelectionChangeEventData,
  View,
} from "react-native";

import { MentionInputProps, MentionPartType, Suggestion } from "../types";
import {
  defaultMentionTextStyle,
  generateValueFromPartsAndChangedText,
  generateValueWithAddedSuggestion,
  getMentionPartSuggestionKeywords,
  isMentionPartType,
  parseValue,
} from "../utils";

const MentionInput: FC<MentionInputProps> = forwardRef(
  (
    {
      value,
      onChange,

      partTypes = [],

      onKeywordChanged,

      inputRef: propInputRef,

      containerStyle,

      onSelectionChange,

      ...textInputProps
    }: MentionInputProps,
    ref: any
  ) => {
    const textInput = useRef<TextInput | null>(null);

    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const { plainText, parts } = useMemo(
      () => parseValue(value, partTypes),
      [value, partTypes]
    );

    const [keywordByTrigger, setKeywordByTrigger] = useState(
      getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes)
    );

    const handleSelectionChange = (
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>
    ) => {
      setSelection(event.nativeEvent.selection);

      onSelectionChange && onSelectionChange(event);
    };

    /**
     * Callback that trigger on TextInput text change
     *
     * @param changedText
     */
    const onChangeInput = (changedText: string) => {
      onChange(
        generateValueFromPartsAndChangedText(parts, plainText, changedText)
      );
    };

    /**
     * We memoize the keyword to know should we show mention suggestions or not
     */

    useEffect(() => {
      setKeywordByTrigger(
        getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes)
      );
      onKeywordChanged(
        getMentionPartSuggestionKeywords(parts, plainText, selection, partTypes)
      );
    }, [parts, plainText, selection, partTypes]);
    // const keywordByTrigger = useMemo(() => {
    //   return getMentionPartSuggestionKeywords(
    //     parts,
    //     plainText,
    //     selection,
    //     partTypes
    //   );
    // }, [parts, plainText, partTypes]);

    /**
     * Callback on mention suggestion press. We should:
     * - Get updated value
     * - Trigger onChange callback with new value
     */

    useImperativeHandle(ref, () => ({
      onSuggestionPress(mentionType: MentionPartType, suggestion: Suggestion) {
        const newValue = generateValueWithAddedSuggestion(
          parts,
          mentionType,
          plainText,
          selection,
          suggestion
        );

        if (!newValue) {
          return;
        }

        onChange(newValue);
      },
    }));

    const onSuggestionPress =
      (mentionType: MentionPartType) => (suggestion: Suggestion) => {
        const newValue = generateValueWithAddedSuggestion(
          parts,
          mentionType,
          plainText,
          selection,
          suggestion
        );

        if (!newValue) {
          return;
        }

        onChange(newValue);

        /**
         * Move cursor to the end of just added mention starting from trigger string and including:
         * - Length of trigger string
         * - Length of mention name
         * - Length of space after mention (1)
         *
         * Not working now due to the RN bug
         */
        // const newCursorPosition = currentPart.position.start + triggerPartIndex + trigger.length +
        // suggestion.name.length + 1;

        // textInput.current?.setNativeProps({selection: {start: newCursorPosition, end: newCursorPosition}});
      };

    const handleTextInputRef = (ref: TextInput) => {
      textInput.current = ref as TextInput;

      if (propInputRef) {
        if (typeof propInputRef === "function") {
          propInputRef(ref);
        } else {
          (propInputRef as MutableRefObject<TextInput>).current =
            ref as TextInput;
        }
      }
    };

    const renderMentionSuggestions = (mentionType: MentionPartType) => {
      // onKeywordChanged && onKeywordChanged(keywordByTrigger[mentionType.trigger]);
      return (
        <React.Fragment key={mentionType.trigger}>
          {mentionType.renderSuggestions &&
            mentionType.renderSuggestions({
              keyword: keywordByTrigger[mentionType.trigger],
              onSuggestionPress: onSuggestionPress(mentionType),
            })}
        </React.Fragment>
      );
    };

    return (
      <View style={containerStyle}>
        {(
          partTypes.filter(
            (one) =>
              isMentionPartType(one) &&
              one.renderSuggestions != null &&
              !one.isBottomMentionSuggestionsRender
          ) as MentionPartType[]
        ).map(renderMentionSuggestions)}

        <TextInput
          multiline
          {...textInputProps}
          ref={handleTextInputRef}
          onChangeText={onChangeInput}
          onSelectionChange={handleSelectionChange}
        >
          <Text>
            {parts.map(({ text, partType, data }, index) =>
              partType ? (
                <Text
                  key={`${index}-${data?.trigger ?? "pattern"}`}
                  style={partType.textStyle ?? defaultMentionTextStyle}
                >
                  {text}
                </Text>
              ) : (
                <Text key={index}>{text}</Text>
              )
            )}
          </Text>
        </TextInput>

        {(
          partTypes.filter(
            (one) =>
              isMentionPartType(one) &&
              one.renderSuggestions != null &&
              one.isBottomMentionSuggestionsRender
          ) as MentionPartType[]
        ).map(renderMentionSuggestions)}
      </View>
    );
  }
);

export { MentionInput };
