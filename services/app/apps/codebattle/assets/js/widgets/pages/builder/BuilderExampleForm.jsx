import React, {
  useRef,
  useState,
  useCallback,
  memo,
  useContext,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import cn from 'classnames';
import { actions } from '../../slices';
import RoomContext from '../../components/RoomContext';
import PreviewAssertsPanel from './PreviewAssertsPanel';
import OutputSignatureEditPanel from './OutputSignatureEditPanel';
import InputSignatureEditPanel from './InputSignatureEditPanel';
import ExamplesEditPanel from './ExamplesEditPanel';
import { MAX_INPUT_ARGUMENTS_COUNT } from '../../utils/builder';
import useKey from '../../utils/useKey';

const navbarItemClassName = 'nav-item nav-link col-3 border-0 rounded-0 px-1 py-2';

const BuilderExampleForm = memo(() => {
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
    inputEditTabRef.current.click();
    setTimeout(() => inputArgumentNameInputRef.current.focus(), 400);
  }, [inputEditTabRef, inputArgumentNameInputRef]);

  const openExampleEditPanel = useCallback(() => {
    exampleEditTabRef.current.click();
    setTimeout(() => exampleArgumentsInputRef.current.focus(), 400);
  }, [exampleEditTabRef, exampleArgumentsInputRef]);

  useKey('Escape', () => {
    if (!argumentsTabRef.current.classList.contains('active')) {
      argumentsTabRef.current.click();
    }
  });

  const inputSignature = useSelector(state => state.builder.task.inputSignature);
  const outputSignature = useSelector(state => state.builder.task.outputSignature);
  const examples = useSelector(state => state.builder.task.assertsExamples);

  const [inputSuggest, setInputSuggest] = useState();
  const [outputSuggest, setOutputSuggest] = useState();
  const [exampleSuggest, setExampleSuggest] = useState();

  const createInputTypeSuggest = useCallback(() => {
    setInputSuggest({ id: Date.now(), argumentName: '', type: { name: 'integer' } });
    setTimeout(() => inputEditTabRef.current.click(), 10);
    setTimeout(() => inputArgumentNameInputRef.current.focus(), 400);
  }, [setInputSuggest]);
  const editInputType = useCallback(item => {
    setInputSuggest(_.cloneDeep(item));
    setTimeout(() => inputEditTabRef.current.click(), 10);
    setTimeout(() => inputSuggestRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    }), 10);
  }, [setInputSuggest]);
  const deleteInputType = useCallback(item => {
    dispatch(actions.removeTaskInputType({
      typeId: item.id,
    }));
    taskService.send('CHANGES');
  }, [dispatch, taskService]);
  const clearInputSuggest = useCallback(() => {
    setInputSuggest();
    argumentsTabRef.current.click();
  }, [setInputSuggest]);
  const submitNewInputSignature = useCallback(() => {
    setExampleSuggest();

    taskService.send('CHANGES');

    let inputSignatureTypeCount = inputSignature.length;
    const existedInputType = _.find(
      inputSignature,
      item => item.id === inputSuggest.id,
    );

    if (existedInputType) {
      dispatch(actions.updateTaskInputType({
        newType: _.cloneDeep(inputSuggest),
      }));
    } else {
      dispatch(actions.addTaskInputType({
        newType: _.cloneDeep(inputSuggest),
      }));
      inputSignatureTypeCount += 1;
    }

    if (inputSignatureTypeCount === MAX_INPUT_ARGUMENTS_COUNT) {
      clearInputSuggest();
    } else {
      createInputTypeSuggest();
    }
  }, [createInputTypeSuggest, clearInputSuggest, inputSignature, inputSuggest, dispatch, taskService]);

  const editOutputType = useCallback(newOutputSignature => {
    setOutputSuggest(_.cloneDeep(newOutputSignature));
    setTimeout(() => outputEditTabRef.current.click(), 10);
  }, [setOutputSuggest]);
  const clearOutputSuggest = useCallback(() => {
    setOutputSuggest();
    argumentsTabRef.current.click();
  }, [setOutputSuggest]);
  const submitNewOutputType = useCallback(() => {
    dispatch(actions.updateTaskOutputType({
      newType: _.cloneDeep(outputSuggest),
    }));

    taskService.send('CHANGES');
    clearOutputSuggest();
  }, [clearOutputSuggest, outputSuggest, dispatch, taskService]);

  const createExampleSuggest = useCallback(() => {
    setExampleSuggest({ id: Date.now(), arguments: '', expected: '' });
    setTimeout(() => exampleEditTabRef.current.click(), 10);
    setTimeout(() => exampleArgumentsInputRef.current.focus(), 400);
  }, []);
  const editExample = useCallback(example => {
    setExampleSuggest(_.cloneDeep(example));
    setTimeout(() => exampleEditTabRef.current.click(), 10);
    setTimeout(() => exampleSuggestRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start',
    }), 10);
  }, [setExampleSuggest]);
  const deleteExample = useCallback(example => {
    dispatch(actions.removeTaskExample({
      exampleId: example.id,
    }));
    taskService.send('CHANGES');
  }, [dispatch, taskService]);
  const clearExample = useCallback(() => {
    setExampleSuggest();
    argumentsTabRef.current.click();
  }, [setExampleSuggest]);
  const submitNewExample = useCallback(() => {
    const existingExample = examples.find(example => (example.id === exampleSuggest.id));

    taskService.send('CHANGES');
    const setExample = existingExample
      ? actions.updateTaskExample
      : actions.addTaskExample;

    dispatch(setExample({
      newExample: _.cloneDeep(exampleSuggest),
    }));

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
            className={`${navbarItemClassName} active`}
            id="arguments-tab"
            data-toggle="tab"
            href="#arguments"
            role="tab"
            aria-controls="arguments"
            aria-selected="true"
          >
            Step 2
          </a>
          <a
            ref={inputEditTabRef}
            className={cn(navbarItemClassName, {
              'd-none': !inputSuggest,
            })}
            id="inputEdit-tab"
            data-toggle="tab"
            href="#inputEdit"
            role="tab"
            aria-controls="inputEdit"
            aria-selected="false"
          >
            Input
          </a>
          <a
            ref={outputEditTabRef}
            className={cn(navbarItemClassName, {
              'd-none': !outputSuggest,
            })}
            id="outputEdit-tab"
            data-toggle="tab"
            href="#outputEdit"
            role="tab"
            aria-controls="outputEdit"
            aria-selected="false"
          >
            Output
          </a>
          <a
            ref={exampleEditTabRef}
            className={cn(navbarItemClassName, {
              'd-none': !exampleSuggest,
            })}
            id="exampleEdit-tab"
            data-toggle="tab"
            href="#exampleEdit"
            role="tab"
            aria-controls="exampleEdit"
            aria-selected="false"
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
          className="tab-pane fade show active"
          id="arguments"
          role="tabpanel"
          aria-labelledby="task-tab"
        >
          <PreviewAssertsPanel
            haveInputSuggest={!!inputSuggest}
            haveExampleSuggest={!!exampleSuggest}
            clearSuggests={clearSuggests}
            openInputEditPanel={openInputEditPanel}
            openExampleEditPanel={openExampleEditPanel}
            createInputTypeSuggest={createInputTypeSuggest}
            editInputType={editInputType}
            deleteInputType={deleteInputType}
            editOutputType={editOutputType}
            createExampleSuggest={createExampleSuggest}
            editExample={editExample}
            clearExample={clearExample}
            deleteExample={deleteExample}
          />
        </div>
        <div
          className="tab-pane fade show"
          id="inputEdit"
          role="tabpanel"
          aria-labelledby="intputEdit-tab"
        >
          <InputSignatureEditPanel
            argumentNameInputRef={inputArgumentNameInputRef}
            items={inputSignature}
            suggest={inputSuggest}
            suggestRef={inputSuggestRef}
            handleAdd={createInputTypeSuggest}
            handleEdit={editInputType}
            handleDelete={deleteInputType}
            handleSubmit={submitNewInputSignature}
            handleClear={clearInputSuggest}
          />
        </div>
        <div
          className="tab-pane fade show"
          id="outputEdit"
          role="tabpanel"
          aria-labelledby="outputEdit-tab"
        >
          <OutputSignatureEditPanel
            item={outputSignature}
            suggest={outputSuggest}
            handleEdit={editOutputType}
            handleSubmit={submitNewOutputType}
            handleClear={clearOutputSuggest}
          />
        </div>
        <div
          className="tab-pane fade show"
          id="exampleEdit"
          role="tabpanel"
          aria-labelledby="exampleEdit-tab"
        >
          <ExamplesEditPanel
            argumentsInputRef={exampleArgumentsInputRef}
            items={examples}
            inputSignature={inputSignature}
            outputSignature={outputSignature}
            suggest={exampleSuggest}
            suggestRef={exampleSuggestRef}
            handleAdd={createExampleSuggest}
            handleEdit={editExample}
            handleDelete={deleteExample}
            handleSubmit={submitNewExample}
            handleClear={clearExample}
          />
        </div>
      </div>
    </div>
  );
});

export default BuilderExampleForm;
