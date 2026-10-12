import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { safeStorage } from './storage'

export type Lang = 'en' | 'ru'

const en = {
  'app.name': 'Russian Exam Prep',
  'nav.exams': 'Exams',
  'nav.history': 'History',
  'nav.admin': 'Admin',
  'nav.login': 'Log in',
  'nav.logout': 'Log out',

  'home.title': 'Practice exams',
  'home.empty': 'No exams yet.',
  'exam.tasks': '{n} tasks',
  'exam.last': 'Last result',
  'exam.myAttempts': 'Your attempts: {n}',
  'exam.training': 'Training',
  'exam.exam': 'Exam',
  'exam.trainingHint': 'Instant feedback and explanations after each question',
  'exam.examHint': 'No answers shown until you finish; you can go back and change answers',
  'exam.loginToStart': 'Log in to start',

  'section.vocabulary': 'Vocabulary',
  'section.grammar': 'Grammar',
  'section.reading': 'Reading',
  'section.history': 'History',
  'section.law': 'Law & constitution',

  'mode.training': 'Training',
  'mode.exam': 'Exam',

  'auth.login': 'Log in',
  'auth.register': 'Create account',
  'auth.username': 'Username',
  'auth.password': 'Password',
  'auth.noAccount': 'No account yet?',
  'auth.haveAccount': 'Already have an account?',
  'auth.passwordHint': 'At least 6 characters',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.invalidCredentials': 'Wrong username or password.',
  'auth.usernameTaken': 'This username is already taken.',
  'auth.usernameInvalid': 'Username must be 3–32 characters: letters, digits, _ . -',
  'auth.passwordInvalid': 'Password must be at least 6 characters.',
  'auth.signedInAs': 'Signed in as {name}',
  'error.network': 'Cannot reach the server. Check your connection and try again.',

  'run.question': 'Question {i} of {n}',
  'run.answered': '{a} of {n} answered',
  'run.prev': 'Previous',
  'run.next': 'Next',
  'run.finish': 'Finish',
  'run.finishing': 'Finishing…',
  'run.confirm': 'You have {n} unanswered question(s). Finish anyway? Unanswered questions count as wrong.',
  'run.confirmAll': 'Finish the attempt and see your results?',
  'run.correct': 'Correct!',
  'run.wrong': 'Not quite. The correct answer is highlighted.',
  'run.explanation': 'Explanation',
  'run.translation': 'Translation',
  'run.timer': 'Time',
  'run.passage': 'Text',
  'run.saveFailed': 'Could not save the answer. Please try again.',

  'result.title': 'Results',
  'result.score': 'Score',
  'result.correct': '{c} of {t} correct',
  'result.time': 'Time spent',
  'result.mode': 'Mode',
  'result.bySection': 'By section',
  'result.review': 'Review',
  'result.yourAnswer': 'Your answer',
  'result.correctAnswer': 'Correct answer',
  'result.noAnswer': 'No answer',
  'result.tryAgain': 'Try again',
  'result.backHome': 'Back to exams',

  'history.title': 'History',
  'history.empty': 'You have not started any exams yet.',
  'history.continue': 'Continue',
  'history.view': 'Results',
  'history.inProgress': 'In progress',

  'admin.title': 'Admin',
  'admin.exams': 'Exams',
  'admin.newExam': 'New exam',
  'admin.titleRu': 'Title (Russian)',
  'admin.titleEn': 'Title (English)',
  'admin.descRu': 'Description (Russian)',
  'admin.descEn': 'Description (English)',
  'admin.create': 'Create',
  'admin.save': 'Save',
  'admin.cancel': 'Cancel',
  'admin.edit': 'Edit',
  'admin.delete': 'Delete',
  'admin.deleteExamConfirm': 'Delete this exam with all its tasks and attempts?',
  'admin.deleteTaskConfirm': 'Delete this task?',
  'admin.tasks': 'Tasks',
  'admin.addTask': 'Add task',
  'admin.editTask': 'Edit task',
  'admin.section': 'Section',
  'admin.promptRu': 'Question (Russian)',
  'admin.promptEn': 'Question translation (English, optional)',
  'admin.passageRu': 'Text to read (Russian, optional)',
  'admin.passageEn': 'Text translation (English, optional)',
  'admin.options': 'Answer options',
  'admin.optionRu': 'Option (Russian)',
  'admin.optionEn': 'Translation (optional)',
  'admin.addOption': 'Add option',
  'admin.removeOption': 'Remove option',
  'admin.correct': 'Correct',
  'admin.explRu': 'Explanation (Russian, optional)',
  'admin.explEn': 'Explanation (English, optional)',
  'admin.noTasks': 'No tasks yet.',
  'admin.back': 'All exams',
  'admin.examSettings': 'Exam details',

  'common.loading': 'Loading…',
  'common.error': 'Something went wrong.',
  'common.notFound': 'Page not found',
  'common.language': 'Language',
  'theme.label': 'Theme',
  'theme.auto': 'Auto',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
} as const

export type TKey = keyof typeof en

const ru: Record<TKey, string> = {
  'app.name': 'Подготовка к экзамену',
  'nav.exams': 'Экзамены',
  'nav.history': 'История попыток',
  'nav.admin': 'Админка',
  'nav.login': 'Войти',
  'nav.logout': 'Выйти',

  'home.title': 'Пробные экзамены',
  'home.empty': 'Экзаменов пока нет.',
  'exam.tasks': 'Заданий: {n}',
  'exam.last': 'Последний результат',
  'exam.myAttempts': 'Ваших попыток: {n}',
  'exam.training': 'Тренировка',
  'exam.exam': 'Экзамен',
  'exam.trainingHint': 'Правильный ответ и объяснение после каждого вопроса',
  'exam.examHint': 'Ответы не показываются до конца; можно возвращаться и менять ответы',
  'exam.loginToStart': 'Войдите, чтобы начать',

  'section.vocabulary': 'Лексика',
  'section.grammar': 'Грамматика',
  'section.reading': 'Чтение',
  'section.history': 'История',
  'section.law': 'Законодательство',

  'mode.training': 'Тренировка',
  'mode.exam': 'Экзамен',

  'auth.login': 'Войти',
  'auth.register': 'Создать аккаунт',
  'auth.username': 'Имя пользователя',
  'auth.password': 'Пароль',
  'auth.noAccount': 'Нет аккаунта?',
  'auth.haveAccount': 'Уже есть аккаунт?',
  'auth.passwordHint': 'Не меньше 6 символов',
  'auth.showPassword': 'Показать пароль',
  'auth.hidePassword': 'Скрыть пароль',
  'auth.invalidCredentials': 'Неверное имя пользователя или пароль.',
  'auth.usernameTaken': 'Это имя пользователя уже занято.',
  'auth.usernameInvalid': 'Имя пользователя: 3–32 символа, буквы, цифры, _ . -',
  'auth.passwordInvalid': 'Пароль должен быть не короче 6 символов.',
  'auth.signedInAs': 'Вы вошли как {name}',
  'error.network': 'Нет связи с сервером. Проверьте соединение и попробуйте снова.',

  'run.question': 'Вопрос {i} из {n}',
  'run.answered': 'Отвечено: {a} из {n}',
  'run.prev': 'Назад',
  'run.next': 'Далее',
  'run.finish': 'Завершить',
  'run.finishing': 'Завершаем…',
  'run.confirm': 'Без ответа осталось вопросов: {n}. Завершить? Они будут засчитаны как неверные.',
  'run.confirmAll': 'Завершить попытку и посмотреть результаты?',
  'run.correct': 'Верно!',
  'run.wrong': 'Неверно. Правильный ответ выделен.',
  'run.explanation': 'Объяснение',
  'run.translation': 'Перевод',
  'run.timer': 'Время',
  'run.passage': 'Текст',
  'run.saveFailed': 'Не удалось сохранить ответ. Попробуйте ещё раз.',

  'result.title': 'Результаты',
  'result.score': 'Результат',
  'result.correct': 'Верно: {c} из {t}',
  'result.time': 'Затрачено времени',
  'result.mode': 'Режим',
  'result.bySection': 'По разделам',
  'result.review': 'Разбор',
  'result.yourAnswer': 'Ваш ответ',
  'result.correctAnswer': 'Правильный ответ',
  'result.noAnswer': 'Нет ответа',
  'result.tryAgain': 'Пройти ещё раз',
  'result.backHome': 'К списку экзаменов',

  'history.title': 'История попыток',
  'history.empty': 'Вы ещё не начинали ни одного экзамена.',
  'history.continue': 'Продолжить',
  'history.view': 'Результаты',
  'history.inProgress': 'В процессе',

  'admin.title': 'Админка',
  'admin.exams': 'Экзамены',
  'admin.newExam': 'Новый экзамен',
  'admin.titleRu': 'Название (рус.)',
  'admin.titleEn': 'Название (англ.)',
  'admin.descRu': 'Описание (рус.)',
  'admin.descEn': 'Описание (англ.)',
  'admin.create': 'Создать',
  'admin.save': 'Сохранить',
  'admin.cancel': 'Отмена',
  'admin.edit': 'Изменить',
  'admin.delete': 'Удалить',
  'admin.deleteExamConfirm': 'Удалить экзамен вместе со всеми заданиями и попытками?',
  'admin.deleteTaskConfirm': 'Удалить задание?',
  'admin.tasks': 'Задания',
  'admin.addTask': 'Добавить задание',
  'admin.editTask': 'Изменить задание',
  'admin.section': 'Раздел',
  'admin.promptRu': 'Вопрос (рус.)',
  'admin.promptEn': 'Перевод вопроса (англ., необязательно)',
  'admin.passageRu': 'Текст для чтения (рус., необязательно)',
  'admin.passageEn': 'Перевод текста (англ., необязательно)',
  'admin.options': 'Варианты ответа',
  'admin.optionRu': 'Вариант (рус.)',
  'admin.optionEn': 'Перевод (необязательно)',
  'admin.addOption': 'Добавить вариант',
  'admin.removeOption': 'Убрать вариант',
  'admin.correct': 'Верный',
  'admin.explRu': 'Объяснение (рус., необязательно)',
  'admin.explEn': 'Объяснение (англ., необязательно)',
  'admin.noTasks': 'Заданий пока нет.',
  'admin.back': 'Все экзамены',
  'admin.examSettings': 'Данные экзамена',

  'common.loading': 'Загрузка…',
  'common.error': 'Что-то пошло не так.',
  'common.notFound': 'Страница не найдена',
  'common.language': 'Язык',
  'theme.label': 'Тема',
  'theme.auto': 'Авто',
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
}

const dictionaries = { en, ru } as const
const LANG_KEY = 'rutest.lang'

function initialLang(): Lang {
  const saved = safeStorage.get(LANG_KEY)
  if (saved === 'en' || saved === 'ru') return saved
  return 'en'
}

type Vars = Record<string, string | number>
type I18n = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Vars) => string
  /** Pick the text for the UI language, falling back to the other one when empty. */
  pick: (ru: string | undefined, en: string | undefined) => string
}

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    safeStorage.set(LANG_KEY, l)
    document.documentElement.lang = l
  }, [])

  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => {
        let s: string = dictionaries[lang][key]
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
        return s
      },
      pick: (r, e) => (lang === 'ru' ? r || e || '' : e || r || ''),
    }),
    [lang, setLang],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n must be used inside I18nProvider')
  return v
}
