import type { components } from './schema'

type S = components['schemas']

export type Exam = S['Exam']
export type ExamInput = S['ExamInput']
export type Task = S['Task']
export type AdminTask = S['AdminTask']
export type ExamRef = S['ExamRef']
export type AdminUser = S['AdminUser']
export type Settings = S['Settings']
export type TaskInput = S['TaskInput']
export type Section = S['Section']
export type Level = S['Level']
export type Mode = S['Mode']
export type Attempt = S['Attempt']
export type AttemptState = S['AttemptState']
export type AnswerState = S['AnswerState']
export type Result = S['Result']
export type ResultItem = S['ResultItem']
export type User = S['User']

export const LEVELS: Level[] = ['rvp', 'vnzh', 'citizenship']
export const SECTIONS: Section[] = ['vocabulary', 'grammar', 'reading', 'history', 'law']
