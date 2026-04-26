import { Request, Response, NextFunction } from "express";
import * as jobService from "../services/job.service";
import { HttpError } from "../lib/httpError";
import { createJobsSchema, jobsQuerySchema } from "../validators/job.validator";

const getParam = (value: string | string[] | undefined, name: string) => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  throw new HttpError(400, `Invalid ${name}`);
};

export const getJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobs = await jobService.getJobs(query);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getProgrammerJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobs = await jobService.getProgrammerJobs(query);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getOperatorJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobs = await jobService.getOperatorJobs(query);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getQcJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = jobsQuerySchema.parse(req.query);
    const jobs = await jobService.getQcJobs(query);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getJobsByGroupId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await jobService.getJobsByGroupId(getParam(req.params.groupId, "groupId"));
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await jobService.getJobById(getParam(req.params.id, "job id"));
    res.json(job);
  } catch (error) {
    next(error);
  }
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = createJobsSchema.parse(req.body);
    const jobs = await jobService.createJobs(payload, req.user);
    res.status(201).json(jobs);
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await jobService.updateJob(getParam(req.params.id, "job id"), req.body, req.user);
    res.json(job);
  } catch (error) {
    next(error);
  }
};

export const updateGroupQcDecision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await jobService.updateGroupQcDecision(getParam(req.params.groupId, "groupId"), req.body, req.user);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const updateGroupQcReportClosed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await jobService.updateGroupQcReportClosed(getParam(req.params.groupId, "groupId"), req.body, req.user);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await jobService.deleteJob(getParam(req.params.id, "job id"), req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteJobsByGroupId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await jobService.deleteJobsByGroupId(getParam(req.params.groupId, "groupId"), req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
