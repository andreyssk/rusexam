import type { components } from './schema'

type S = components['schemas']

export type Exam = S['Exam']
export type ExamInput = S['ExamInput']
export type Task = S['Task']
export type TaskInput = S['TaskInput']
export type Option = S['Option']
export type Section = S['Section']
export type Mode = S['Mode']
export type Attempt = S['Attempt']
export type AttemptState = S['AttemptState']
export type AnswerState = S['AnswerState']
export type Result = S['Result']
export type ResultItem = S['ResultItem']
export type User = S['User']

export const SECTIONS: Section[] = ['vocabulary', 'grammar', 'reading', 'history', 'law']
