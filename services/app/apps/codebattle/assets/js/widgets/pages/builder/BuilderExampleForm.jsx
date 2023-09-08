import React, { useRef, useState, useCallback, memo, useContext } from 'react';

import cn from 'classnames';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch, useSelector } from 'react-redux';

import RoomContext from '../../components/RoomContext';
import { actions } from '../../slices';
import { MAX_INPUT_ARGUMENTS_COUNT } from '../../utils/builder';
import useKey from '../../utils/useKey';

import ExamplesEditPanel from './ExamplesEditPanel';
import InputSignatureEditPanel from './InputSignatureEditPanel';
import OutputSignatureEditPanel from './OutputSignatureEditPanel';
import PreviewAssertsPanel from './PreviewAssertsPanel';

const navbarItemClassName = 'nav-item nav-link col-3 border-0 rounded-0 px-1 py-2';

function BuilderExampleForm() {
  const dispatch = useDispatch();
  const { taskService } = useContext(RoomContext);

  const argumentsTabRef = useRef(null);
  const inputEditTabRef = useRef(null);
  const outputEditTabRef = useRef(null);
  const exampleEditTabRef = useRef(null);

  const inputSuggestRef = useRef(null);
  const exampleSuggestRef = useRef(null);

  const inputArgumentNameInputRef = useRef(null);
  const exampleArgumentsInputRef = useRef(null);

  const openInputEditPanel = useCallback(() => {
    inputEditTabRef.current?.click();
    setTimeout(() => inputArgumentNameInputRef.current?.focus(), 400);
  }, [inputEditTabRef, inputArgumentNameInputRef]);

  const openExampleEditPanel = useCallback(() => {
    exampleEditTabRef.current?.click();
    setTimeout(() => exampleArgumentsInputRef.current?.focus(), 400);
  }, [exampleEditTabRef, exampleArgumentsInputRef]);

  useKey('Escape', () => {
    if (!argumentsTabRef.current.classList.contains('active')) {
      argumentsTabRef.current?.click();
    }
  });

  const inputSignature = useSelector((state) => state.builder.task.inputSignature);
  const outputSignature = useSelector((state) => state.builder.task.outputSignature);
  const examples = useSelector((state) => state.builder.task.assertsExamples);

  const [inputSuggest, setInputSuggest] = useState();
  const [outputSuggest, setOutputSuggest] = useState();
  const [exampleSuggest, setExampleSuggest] = useState();

  const createInputTypeSuggest = useCallback(() => {
    setInputSuggest({ id: Date.now(), argumentName: '', type: { name: 'integer' } });
    setTimeout(() => inputEditTabRef.current?.click(), 10);
    setTimeout(() => inputArgumentNameInputRef.current?.focus(), 400);
  }, [setInputSuggest]);
  const editInputType = useCallback(
    (item) => {
      setInputSuggest(cloneDeep(item));
      setTimeout(() => inputEditTabRef.current?.click(), 10);
      setTimeout(
        () =>
          inputSuggestRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
          }),
        10,
      );
    },
    [setInputSuggest],
  );
  const deleteInputType = useCallback(
    (item) => {
      dispatch(
        actions.removeTaskInputType({
          typeId: item.id,
        }),
      );
      taskService.send('CHANGES');
    },
    [dispatch, taskService],
  );
  const clearInputSuggest = useCallback(() => {
    setInputSuggest();
    argumentsTabRef.current?.click();
  }, [setInputSuggest]);
  const submitNewInputSignature = useCallback(() => {
    setExampleSuggest();

    taskService.send('CHANGES');

    let inputSignatureTypeCount = inputSignature.length;
    const existedInputType = inputSignature.find((item) => item.id === inputSuggest.id);

    if (existedInputType) {
      dispatch(
        actions.updateTaskInputType({
          newType: cloneDeep(inputSuggest),
        }),
      );
    } else {
      dispatch(
        actions.addTaskInputType({
          newType: cloneDeep(inputSuggest),
        }),
      );
      inputSignatureTypeCount += 1;
    }

    if (inputSignatureTypeCount === MAX_INPUT_ARGUMENTS_COUNT) {
      clearInputSuggest();
    } else {
      createInputTypeSuggest();
    }
  }, [
    createInputTypeSuggest,
    clearInputSuggest,
    inputSignature,
    inputSuggest,
    dispatch,
    taskService,
  ]);

  const editOutputType = useCallback(
    (newOutputSignature) => {
      setOutputSuggest(cloneDeep(newOutputSignature));
      setTimeout(() => outputEditTabRef.current?.click(), 10);
    },
    [setOutputSuggest],
  );
  const clearOutputSuggest = useCallback(() => {
    setOutputSuggest();
    argumentsTabRef.current?.click();
  }, [setOutputSuggest]);
  const submitNewOutputType = useCallback(() => {
    dispatch(
      actions.updateTaskOutputType({
        newType: cloneDeep(outputSuggest),
      }),
    );

    taskService.send('CHANGES');
    clearOutputSuggest();
  }, [clearOutputSuggest, outputSuggest, dispatch, taskService]);

  const createExampleSuggest = useCallback(() => {
    setExampleSuggest({ id: Date.now(), arguments: '', expected: '' });
    setTimeout(() => exampleEditTabRef.current?.click(), 10);
    setTimeout(() => exampleArgumentsInputRef.current?.focus(), 400);
  }, []);
  const editExample = useCallback(
    (example) => {
      setExampleSuggest(cloneDeep(example));
      setTimeout(() => exampleEditTabRef.current?.click(), 10);
      setTimeout(
        () =>
          exampleSuggestRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
          }),
        10,
      );
    },
    [setExampleSuggest],
  );
  const deleteExample = useCallback(
    (example) => {
      dispatch(
        actions.removeTaskExample({
          exampleId: example.id,
        }),
      );
      taskService.send('CHANGES');
    },
    [dispatch, taskService],
  );
  const clearExample = useCallback(() => {
    setExampleSuggest();
    argumentsTabRef.current?.click();
  }, [setExampleSuggest]);
  const submitNewExample = useCallback(() => {
    const existingExample = examples.find((example) => example.id === exampleSuggest.id);

    taskService.send('CHANGES');
    const setExample = existingExample ? actions.updateTaskExample : actions.addTaskExample;

    dispatch(
      setExample({
        newExample: cloneDeep(exampleSuggest),
      }),
    );

    createExampleSuggest();
  }, [examples, exampleSuggest, createExampleSuggest, dispatch, taskService]);

  const clearSuggests = useCallback(() => {
    setInputSuggest();
    setOutputSuggest();
    setExampleSuggest();
  }, [setInputSuggest, setOutputSuggest, setExampleSuggest]);

  return (
    <div className="d-flex shadow-sm flex-column h-100">
      <nav>
        <div
          className="nav nav-tabs bg-gray text-uppercase font-weight-bold text-center"
          id="nav-tab"
          role="tablist"
        >
          <a
            ref={argumentsTabRef}
            aria-controls="arguments"
            aria-selected="true"
            className={`${navbarItemClassName} active`}
            data-toggle="tab"
            href="#arguments"
            id="arguments-tab"
            role="tab"
          >
            Step 2
          </a>
          <a
            ref={inputEditTabRef}
            aria-controls="inputEdit"
            aria-selected="false"
            data-toggle="tab"
            href="#inputEdit"
            id="inputEdit-tab"
            role="tab"
            className={cn(navbarItemClassName, {
              'd-none': !inputSuggest,
            })}
          >
            Input
          </a>
          <a
            ref={outputEditTabRef}
            aria-controls="outputEdit"
            aria-selected="false"
            data-toggle="tab"
            href="#outputEdit"
            id="outputEdit-tab"
            role="tab"
            className={cn(navbarItemClassName, {
              'd-none': !outputSuggest,
            })}
          >
            Output
          </a>
          <a
            ref={exampleEditTabRef}
            aria-controls="exampleEdit"
            aria-selected="false"
            data-toggle="tab"
            href="#exampleEdit"
            id="exampleEdit-tab"
            role="tab"
            className={cn(navbarItemClassName, {
              'd-none': !exampleSuggest,
            })}
          >
            Example
          </a>
        </div>
      </nav>
      <div
        className="tab-content flex-grow-1 bg-white p-3 rounded-bottom h-100"
        id="nav-tabContent"
      >
        <div
          aria-labelledby="task-tab"
          className="tab-pane fade show active"
          id="arguments"
          role="tabpanel"
        >
          <PreviewAssertsPanel
            clearExample={clearExample}
            clearSuggests={clearSuggests}
            createExampleSuggest={createExampleSuggest}
            createInputTypeSuggest={createInputTypeSuggest}
            deleteExample={deleteExample}
            deleteInputType={deleteInputType}
            editExample={editExample}
            editInputType={editInputType}
            editOutputType={editOutputType}
            haveExampleSuggest={!!exampleSuggest}
            haveInputSuggest={!!inputSuggest}
            openExampleEditPanel={openExampleEditPanel}
            openInputEditPanel={openInputEditPanel}
          />
        </div>
        <div
          aria-labelledby="intputEdit-tab"
          className="tab-pane fade show"
          id="inputEdit"
          role="tabpanel"
        >
          <InputSignatureEditPanel
            argumentNameInputRef={inputArgumentNameInputRef}
            handleAdd={createInputTypeSuggest}
            handleClear={clearInputSuggest}
            handleDelete={deleteInputType}
            handleEdit={editInputType}
            handleSubmit={submitNewInputSignature}
            items={inputSignature}
            suggest={inputSuggest}
            suggestRef={inputSuggestRef}
          />
        </div>
        <div
          aria-labelledby="outputEdit-tab"
          className="tab-pane fade show"
          id="outputEdit"
          role="tabpanel"
        >
          <OutputSignatureEditPanel
            handleClear={clearOutputSuggest}
            handleEdit={editOutputType}
            handleSubmit={submitNewOutputType}
            item={outputSignature}
            suggest={outputSuggest}
          />
        </div>
        <div
          aria-labelledby="exampleEdit-tab"
          className="tab-pane fade show"
          id="exampleEdit"
          role="tabpanel"
        >
          <ExamplesEditPanel
            argumentsInputRef={exampleArgumentsInputRef}
            handleAdd={createExampleSuggest}
            handleClear={clearExample}
            handleDelete={deleteExample}
            handleEdit={editExample}
            handleSubmit={submitNewExample}
            inputSignature={inputSignature}
            items={examples}
            outputSignature={outputSignature}
            suggest={exampleSuggest}
            suggestRef={exampleSuggestRef}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(BuilderExampleForm);
