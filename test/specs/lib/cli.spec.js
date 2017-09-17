'use strict'

const fs = require('fs')
const path = require('path')
const stream = require('stream')
const assert = require('assert')

const cli = require('../../../lib/cli')
const fixturesPath = path.join(__dirname, '../../fixtures')
const readmefile = path.join(fixturesPath, 'README.md')
const notfoundfile = path.join(fixturesPath, 'notfound.vue')
const checkboxfile = path.join(fixturesPath, 'checkbox.vue')

class OutputStream extends stream.Writable {
  _write(chunk, enc, next) {
    next()
  }
}

const originalStdout = process.stdout
const writer = new OutputStream()

/* global describe it */

describe('lib/cli', () => {
  describe('validateOptions(options)', () => {
    const defaultOptions = { stream: true, filenames: [] }

    describe('--section', () => {
      const section = 'API'
      const options = Object.assign({}, defaultOptions, { section })

      it('should failed with missing --output option', () => {
        assert.throws(
          () => cli.validateOptions(options), /--output is required/)
      })

      it('should failed with invalid --output option value', () => {
        const output = fixturesPath
        const _options = Object.assign({}, options, { output })

        assert.throws(
          () => cli.validateOptions(_options), /--output value must be a file/)
      })

      it('should successfully validate', () => {
        const output = readmefile
        const _options = Object.assign({}, options, { output })

        assert.doesNotThrow(() => cli.validateOptions(_options))
      })
    })

    describe('with right options', () => {
      it('should successfully validate', () => {
        assert.doesNotThrow(() => cli.validateOptions(defaultOptions))
      })
    })
  })

  describe('parseArgs(argv)', () => {
    let options
    const defaultOptions = { stream: true, filenames: [] }

    beforeEach(() => {
      options = {}
    })

    describe('--level', () => {
      it('should failed with missing level value', () => {
        const argv = [ '--level' ]

        assert.throws(() => cli.parseArgs(argv), /Missing level value/)
      })

      it('should failed with invalid level value', () => {
        const argv = [ '--level', 'hello.vue' ]

        assert.throws(() => cli.parseArgs(argv), /Invalid level value/)
      })

      it('should successfully set the level option', () => {
        const level = 2
        const argv = [ '--level', level ]

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { level })

        assert.deepEqual(options, expected)
      })
    })

    describe('--output', () => {
      it('should failed with missing level value', () => {
        const argv = [ '--output' ]

        assert.throws(() => cli.parseArgs(argv), /Missing output value/)
      })

      it('should successfully set the output option', () => {
        const output = fixturesPath
        const argv = [ '--output', output ]

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { output })

        assert.deepEqual(options, expected)
      })
    })

    describe('--section', () => {
      it('should failed with missing level value', () => {
        const argv = [ '--section' ]

        assert.throws(() => cli.parseArgs(argv), /Missing section value/)
      })

      it('should successfully set the section option', () => {
        const section = 'API'
        const output = readmefile
        const argv = [
          '--section', section,
          '--output', output
        ]

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { section, output })

        assert.deepEqual(options, expected)
      })
    })

    describe('--ignore-name', () => {
      it('should successfully set the ignore-name option', () => {
        const argv = [ '--ignore-name' ]

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { ignoreName: true })

        assert.deepEqual(options, expected)
      })
    })

    describe('--ignore-description', () => {
      it('should successfully set the ignore-description option', () => {
        const argv = [ '--ignore-description' ]

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { ignoreDescription: true })

        assert.deepEqual(options, expected)
      })
    })

    describe('filenames', () => {
      it('should successfully set files', () => {
        const filenames = [ '/tmp/checkbox.vue', '/tmp/textarea.vue' ]
        const argv = filenames

        assert.doesNotThrow(() => (options = cli.parseArgs(argv)))

        const expected = Object.assign({}, defaultOptions, { filenames })

        assert.deepEqual(options, expected)
      })
    })
  })

  describe('parseArgs(argv, requireFiles)', () => {
    let options
    const argv = ['node', 'vuedoc.md']
    const defaultOptions = { stream: true, filenames: [] }

    beforeEach(() => {
      options = {}
    })

    it('should failed with missing files', () => {
      assert.throws(() => cli.parseArgs([], true), /Missing filename/)
    })

    it('should successfully set files', () => {
      const filenames = [ '/tmp/checkbox.vue', '/tmp/textarea.vue' ]
      const argv = filenames

      assert.doesNotThrow(() => (options = cli.parseArgs(argv, true)))

      const expected = Object.assign({}, defaultOptions, { filenames })

      assert.deepEqual(options, expected)
    })
  })

  describe('findSectionNode(section)', () => {
    it('should successfully found section node', () => {
      const section = 'API'
      const node = {
        type: 'Header',
        children: [
          {
            type: 'Str',
            value: section,
            raw: section
          }
        ],
        raw: `# ${section}`
      }
      const tree = {
        type: 'Document',
        children: [
          {
            type: 'Str',
            value: 'Text',
            raw: 'Text'
          },
          node
        ],
        raw: `Text\n\n# ${section}`
      }
      const expected = node
      const foundNode = tree.children.find(cli.findSectionNode(section))

      assert.ok(foundNode)
      assert.deepEqual(foundNode, expected)
    })
  })

  describe('processRawContent(argv, componentRawContent)', () => {
    beforeEach(() => {
      process.__defineGetter__('stdout', function() {
        return writer
      })
    })

    afterEach(() => {
      process.__defineGetter__('stdout', function() {
        return originalStdout
      })
    })

    it('should failed to generate the component documentation', (done) => {
      const argv = []
      const componentRawContent = `
        <template>
          <input @click="input"/>
        </template>
        <script>var skrgj=!</script>
      `

      cli.processRawContent(argv, componentRawContent)
        .then(() => done(new Error()))
        .catch(() => done())
    })

    it('should successfully generate the component documentation', () => {
      const argv = []
      const filename = checkboxfile
      const componentRawContent = fs.readFileSync(filename, 'utf8')

      return cli.processRawContent(argv, componentRawContent)
    })
  })

  describe('processWithOutputOption(options)', () => {
    const mock = require('mock-fs')
    const output = path.join(fixturesPath, 'output.md')
    const readmeContent = fs.readFileSync(readmefile, 'utf8')

    beforeEach(() => {
      mock({
        [output]: readmeContent
      })
    })

    afterEach(mock.restore)

    it('should failed to generate the component documentation', (done) => {
      const filenames = [ notfoundfile ]
      const options = { output, filenames }

      cli.processWithOutputOption(options)
        .then(() => done(new Error()))
        .catch(() => done())
    })

    it('should successfully generate the component documentation', () => {
      const filenames = [ output ]
      const options = { output, filenames }

      cli.processWithOutputOption(options)
        .catch((err) => console.error(err))
    })
  })

  describe('processWithoutOutputOption(options)', () => {
    beforeEach(() => {
      process.__defineGetter__('stdout', function() {
        return writer
      })
    })

    afterEach(() => {
      process.__defineGetter__('stdout', function() {
        return originalStdout
      })
    })

    it('should failed to generate the component documentation', (done) => {
      const options = { filenames: [ notfoundfile ] }

      cli.processWithoutOutputOption(options)
        .then(() => done(new Error()))
        .catch(() => done())
    })

    it('should successfully generate the component documentation', () => {
      const options = { filenames: [ checkboxfile ] }

      return cli.processWithoutOutputOption(options)
    })
  })
})