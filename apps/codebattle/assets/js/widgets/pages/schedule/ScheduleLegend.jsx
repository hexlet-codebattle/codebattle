import React from "react";

import cn from "classnames";
import { useSelector } from "react-redux";

import i18n from "../../../i18n";
import { currentUserIsAdminSelector } from "@/selectors";

export const states = {
  contest: "#contest",
  my: "#my",
  all: "#all",
};

const sectionBtnClassName = cn("btn btn-secondary cb-btn-secondary cb-rounded w-100 m-2");

function ScheduleLegend({ onChangeContext, loading, context }) {
  const isAdmin = useSelector(currentUserIsAdminSelector);

  return (
    <div
      className={cn(
        "align-items-center justify-content-center p-1 pb-4",
        "d-flex flex-column flex-lg-row flex-md-row",
      )}
    >
      <button
        type="button"
        className={cn(sectionBtnClassName, {
          active: context === states.contest,
        })}
        data-context={states.contest}
        onClick={onChangeContext}
        disabled={loading}
      >
        {i18n.t("Contests History")}
      </button>
      <button
        type="button"
        className={cn(sectionBtnClassName, { active: context === states.my })}
        data-context={states.my}
        onClick={onChangeContext}
        disabled={loading}
      >
        {i18n.t("My Tournaments")}
      </button>
      {isAdmin && (
        <button
          type="button"
          className={cn(sectionBtnClassName, {
            active: context === states.all,
          })}
          data-context={states.all}
          onClick={onChangeContext}
          disabled={loading}
        >
          {i18n.t("All Tournaments")}
        </button>
      )}
    </div>
  );
}

export default ScheduleLegend;
