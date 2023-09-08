import { createSlice } from '@reduxjs/toolkit';
import capitalize from 'lodash/capitalize';
import remove from 'lodash/remove';

import {
  validateTaskName,
  validateDescription,
  validateInputSignatures,
  validateExamples,
  taskTemplatesStates,
  getExamplesFromAsserts,
  getTaskTemplates,
} from '../utils/builder';

import initial from './initial';

const getTaskAssertsStatus = (task) => ({
  status: task.asserts.length > 0 ? 'ok' : 'none',
  output: '',
});

const builder = createSlice({
  name: 'builder',
  initialState: initial.builder,
  reducers: {
    setTask: (state, { payload: { task } }) => {
      state.task = { ...state.task, ...task };

      state.templates = getTaskTemplates(task);

      state.assertsStatus = getTaskAssertsStatus(task);

      state.textSolution = state.templates.solution;
      state.textArgumentsGenerator = state.templates.argumentsGenerator;
      state.generatorLang = task.generatorLang;

      state.validationStatuses.name = validateTaskName(task.name);
      state.validationStatuses.description = validateTaskName(task.descriptionEn);
      state.validationStatuses.inputSignature = validateInputSignatures(task.inputSignature);
      state.validationStatuses.assertsExamples = validateExamples(task.assertsExamples);
    },
    setTaskName: (state, { payload: { name } }) => {
      state.task.name = name;

      state.validationStatuses.name = validateTaskName(name);
    },
    setTaskLevel: (state, { payload: { level } }) => {
      state.task.level = level;
    },
    setTaskDescription: (state, { payload: { lang, value } }) => {
      state.task[`description${capitalize(lang)}`] = value;

      state.validationStatuses.description = validateDescription(value);
    },
    setTaskTemplates: (state, { payload: { argumentsGenerator, solution } }) => {
      state.templates = {
        solution,
        argumentsGenerator,
        state: taskTemplatesStates.init,
      };
      state.textSolution = solution;
      state.textArgumentsGenerator = argumentsGenerator;
    },
    resetGeneratorAndSolution: (state) => {
      const prevGeneratorLang = state.task.generatorLang;

      state.textSolution = {
        ...state.templates.solution,
        [prevGeneratorLang]: state.templates.solution[prevGeneratorLang],
      };
      state.textArgumentsGenerator = {
        ...state.templates.argumentsGenerator,
        [prevGeneratorLang]: state.templates.argumentsGenerator[prevGeneratorLang],
      };
      state.generatorLang = prevGeneratorLang;

      if (
        !state.validationStatuses.solution[0] ||
        !state.validationStatuses.argumentsGenerator[0]
      ) {
        state.validationStatuses.solution = [true];
        state.validationStatuses.argumentsGenerator = [true];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    rejectGeneratorAndSolution: (state) => {
      state.templates.state = 'none';

      if (
        !state.validationStatuses.solution[0] ||
        !state.validationStatuses.argumentsGenerator[0]
      ) {
        state.validationStatuses.solution = [true];
        state.validationStatuses.argumentsGenerator = [true];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    setTaskTemplatesState: (state, { payload }) => {
      state.templates.state = payload;
    },
    setTaskAsserts: (state, { payload: { asserts, output = '', status } }) => {
      state.task.asserts = asserts;
      state.task.examples = getExamplesFromAsserts(state.task.assertsExamples);
      state.assertsStatus = {
        status,
        output,
      };
    },
    addTaskInputType: (state, { payload: { newType } }) => {
      state.task.inputSignature = [...state.task.inputSignature, newType];
      if (state.task.assertsExamples.length > 0) {
        state.task.assertsExamples = [];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }

      state.validationStatuses.inputSignature = validateInputSignatures(state.task.inputSignature);
    },
    updateTaskInputType: (state, { payload: { newType } }) => {
      state.task.inputSignature = state.task.inputSignature.map((item) =>
        item.id === newType.id ? newType : item,
      );
      if (state.task.assertsExamples.length > 0) {
        state.task.assertsExamples = [];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    removeTaskInputType: (state, { payload: { typeId } }) => {
      remove(state.task.inputSignature, (item) => item.id === typeId);
      if (state.task.assertsExamples.length > 0) {
        state.task.assertsExamples = [];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }

      state.validationStatuses.inputSignature = validateInputSignatures(state.task.inputSignature);
    },
    updateTaskOutputType: (state, { payload: { newType } }) => {
      state.task.outputSignature = newType;
      if (state.task.assertsExamples.length > 0) {
        state.task.assertsExamples = [];
      }
    },
    addTaskExample: (state, { payload: { newExample } }) => {
      state.task.assertsExamples = [...state.task.assertsExamples, newExample];
      state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
    },
    updateTaskExample: (state, { payload: { newExample } }) => {
      state.task.assertsExamples = state.task.assertsExamples.map((example) =>
        example.id === newExample.id ? newExample : example,
      );
      state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
    },
    removeTaskExample: (state, { payload: { exampleId } }) => {
      remove(state.task.assertsExamples, (item) => item.id === exampleId);
      state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
    },
    setGeneratorsLang: (state, { payload: { lang } }) => {
      state.generatorLang = lang;

      if (
        !state.validationStatuses.solution[0] ||
        !state.validationStatuses.argumentsGenerator[0]
      ) {
        state.validationStatuses.solution = [true];
        state.validationStatuses.argumentsGenerator = [true];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    setTaskSolution: (state, { payload: { value } }) => {
      state.textSolution[state.generatorLang] = value;

      if (!state.validationStatuses.solution[0]) {
        state.validationStatuses.solution = [true];
        state.validationStatuses.argumentsGenerator = [true];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    setTaskArgumentsGenerator: (state, { payload: { value } }) => {
      state.textArgumentsGenerator[state.generatorLang] = value;

      if (!state.validationStatuses.argumentsGenerator[0]) {
        state.validationStatuses.solution = [true];
        state.validationStatuses.argumentsGenerator = [true];
        state.validationStatuses.assertsExamples = validateExamples(state.task.assertsExamples);
      }
    },
    setTaskVisibility: (state, { payload }) => {
      state.task.visibility = payload;
    },
    setTaskState: (state, { payload }) => {
      state.task.state = payload;
    },
    setValidationStatuses: (state, { payload }) => {
      state.validationStatuses = {
        ...state.validationStatuses,
        ...payload,
      };
    },
  },
});

const { actions, reducer } = builder;

export { actions };
export default reducer;
